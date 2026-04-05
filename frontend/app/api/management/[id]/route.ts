import { NextResponse } from 'next/server';

export async function PATCH() {
  return NextResponse.json({ error: 'Legacy management accounts are no longer supported.' }, { status: 410 });
}
