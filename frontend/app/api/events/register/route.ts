import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/mailer";

// ── Types ────────────────────────────────────────────────────────────────────
interface ParsedUser {
  name: string;
  email: string;
}

// ── CSV helpers ──────────────────────────────────────────────────────────────
const NAME_ALIASES = ["name", "full name", "fullname", "first name", "firstname"];
const EMAIL_ALIASES = ["email", "email address", "emailaddress", "e-mail", "mail"];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim()); current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    rows.push(cols);
  }
  return rows;
}

function extractUsers(text: string): { users: ParsedUser[]; errors: string[] } {
  const rows = parseCSV(text);
  if (rows.length < 2) return { users: [], errors: ["CSV has no data rows."] };

  const headers = rows[0].map((h) => h.toLowerCase().replace(/"/g, "").trim());
  const nameIdx = headers.findIndex((h) => NAME_ALIASES.includes(h));
  const emailIdx = headers.findIndex((h) => EMAIL_ALIASES.includes(h));

  if (emailIdx === -1) {
    return {
      users: [],
      errors: [`No email column found. Expected one of: ${EMAIL_ALIASES.join(", ")}`],
    };
  }

  const users: ParsedUser[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const email = row[emailIdx]?.replace(/"/g, "").trim();
    const name = nameIdx !== -1 ? row[nameIdx]?.replace(/"/g, "").trim() ?? "" : "";

    if (!email) { errors.push(`Row ${i + 1}: missing email — skipped`); continue; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${i + 1}: invalid email "${email}" — skipped`);
      continue;
    }
    users.push({ name, email });
  }

  return { users, errors };
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ── 1. Validate inputs ──────────────────────────────────────────────────
    const file = formData.get("file");
    const eventType = formData.get("eventType")?.toString().trim();
    const plate = formData.get("plate")?.toString().trim() || null;
    const description = formData.get("description")?.toString().trim() || null;

    if (!eventType) {
      return NextResponse.json({ error: "eventType is required." }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
    }
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only .csv files accepted." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    // ── 2. Parse CSV ────────────────────────────────────────────────────────
    const text = await file.text();
    const { users, errors: parseErrors } = extractUsers(text);

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No valid users found in CSV.", details: parseErrors },
        { status: 400 }
      );
    }

    // ── 3. Create event, upsert users, link — sequential (no transaction) ────
    // Prisma 7 + serverless Postgres can't hold long-lived transactions (P2028).
    // Sequential awaits are safe here: the event is created first, then each
    // user is upserted and linked. A partial failure only skips that user.

    // a) Create the root event record
    const event = await prisma.event.create({
      data: {
        type: eventType,
        plate: plate ?? undefined,
        description: description ?? undefined,
      },
    });

    // b) Upsert each user, create their linked event row with a verification code, send email
    let usersAdded = 0;
    const dbErrors: string[] = [];

    for (const { name, email } of users) {
      try {
        const user = await prisma.user.upsert({
          where: { email },
          update: { ...(name ? { name } : {}) },
          create: { email, name: name || null },
        });

        const verificationCode = generateVerificationCode();

        await prisma.event.create({
          data: {
            type: eventType,
            plate: plate ?? undefined,
            description: description ?? undefined,
            userId: user.id,
            verificationCode,
          },
        });

        // Send email — non-blocking: a mail failure won't abort the whole import
        sendVerificationEmail({
          to: email,
          name: name || email,
          eventType,
          eventDescription: description,
          code: verificationCode,
        }).catch((mailErr) => {
          console.error(`[events/register] mail failed for ${email}:`, mailErr);
        });

        usersAdded++;
      } catch (rowErr) {
        console.error(`[events/register] skipping ${email}:`, rowErr);
        dbErrors.push(`${email}: could not be saved`);
      }
    }

    const result = { eventId: event.id, usersAdded };

    const allErrors = [...parseErrors, ...dbErrors];

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      usersAdded: result.usersAdded,
      ...(allErrors.length > 0 && { errors: allErrors }),
    });
  } catch (err) {
    console.error("[events/register]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}