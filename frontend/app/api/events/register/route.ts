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

    const file = formData.get("file");
    const manualEntriesRaw = formData.get("manualEntries")?.toString() ?? "[]";
    const eventId = Number(formData.get("eventId")?.toString());

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: "eventId is required." }, { status: 400 });
    }

    const selectedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        type: true,
        plate: true,
        description: true,
        userId: true,
      },
    });

    if (!selectedEvent || selectedEvent.userId !== null) {
      return NextResponse.json({ error: "Selected event not found." }, { status: 404 });
    }

    const parseErrors: string[] = [];
    let users: ParsedUser[] = [];

    if (file instanceof File) {
      if (!file.name.endsWith(".csv")) {
        return NextResponse.json({ error: "Only .csv files accepted." }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
      }

      const text = await file.text();
      const csvResult = extractUsers(text);
      users = csvResult.users;
      parseErrors.push(...csvResult.errors);
    }

    let manualEntries: Array<{ name?: string; email?: string }> = [];
    try {
      const parsed = JSON.parse(manualEntriesRaw);
      if (Array.isArray(parsed)) {
        manualEntries = parsed;
      }
    } catch {
      return NextResponse.json({ error: "Invalid manualEntries format." }, { status: 400 });
    }

    manualEntries.forEach((entry, index) => {
      const email = (entry.email ?? "").toString().trim();
      const name = (entry.name ?? "").toString().trim();

      if (!email) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        parseErrors.push(`Manual row ${index + 1}: invalid email \"${email}\" — skipped`);
        return;
      }

      users.push({ name, email });
    });

    const dedupedUsers = Array.from(
      new Map(users.map((user) => [user.email.toLowerCase(), user])).values()
    );

    if (dedupedUsers.length === 0) {
      return NextResponse.json(
        { error: "No valid attendees found in CSV or manual entries.", details: parseErrors },
        { status: 400 }
      );
    }

    let usersAdded = 0;
    const dbErrors: string[] = [];

    for (const { name, email } of dedupedUsers) {
      try {
        const user = await prisma.user.upsert({
          where: { email },
          update: { ...(name ? { name } : {}) },
          create: { email, name: name || null },
        });

        const verificationCode = generateVerificationCode();

        await prisma.event.create({
          data: {
            type: selectedEvent.type,
            plate: selectedEvent.plate ?? undefined,
            description: selectedEvent.description ?? undefined,
            userId: user.id,
            verificationCode,
          },
        });

        sendVerificationEmail({
          to: email,
          name: name || email,
          eventType: selectedEvent.type,
          eventDescription: selectedEvent.description,
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

    const result = { eventId: selectedEvent.id, usersAdded };

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