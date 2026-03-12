import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Adjust path to your lib folder

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
  }
}

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}