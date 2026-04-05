import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, isPasswordHash, hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true, role: true },
    });

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!isPasswordHash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) },
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[api/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
