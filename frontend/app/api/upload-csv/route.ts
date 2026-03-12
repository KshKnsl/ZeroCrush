import { NextRequest, NextResponse } from "next/server";

interface ParsedUser {
  name: string;
  email: string;
}

// Normalizes header names — handles casing and common variants
const NAME_ALIASES = ["name", "full name", "fullname", "first name", "firstname", "contact"];
const EMAIL_ALIASES = ["email", "email address", "emailaddress", "e-mail", "mail"];

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) =>
    aliases.includes(h.trim().toLowerCase())
  );
}

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
        // Handle escaped quotes ""
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cols.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current);
    rows.push(cols);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only .csv files are accepted." }, { status: 400 });
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV has no data rows." }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const nameIdx = findColumn(headers, NAME_ALIASES);
    const emailIdx = findColumn(headers, EMAIL_ALIASES);

    if (emailIdx === -1) {
      return NextResponse.json(
        { error: `No email column found. Expected one of: ${EMAIL_ALIASES.join(", ")}` },
        { status: 400 }
      );
    }

    const users: ParsedUser[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const email = row[emailIdx]?.trim();
      const name = nameIdx !== -1 ? row[nameIdx]?.trim() ?? "" : "";

      if (!email) {
        errors.push(`Row ${i + 1}: missing email — skipped`);
        continue;
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Row ${i + 1}: invalid email "${email}" — skipped`);
        continue;
      }

      users.push({ name, email });
    }
    //console.log(`[upload-csv] Parsed ${users.length} users with ${errors.length} errors. and users: ${JSON.stringify(users)}`);
 
    

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err) {
    console.error("[upload-csv]", err);
    return NextResponse.json({ error: "Failed to process CSV." }, { status: 500 });
  }
}