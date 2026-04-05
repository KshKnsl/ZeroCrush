import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageUsers, type UserRole } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

function getCallerRole(request: NextRequest): UserRole | null {
  const role = request.headers.get('x-user-role');
  if (role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER') {
    return role;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const role = getCallerRole(request);
    if (!canManageUsers(role ?? undefined)) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = getCallerRole(request);
    if (!canManageUsers(role ?? undefined)) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const { name, email, password, role: nextRole } = await request.json();

    if (!email || !password || !nextRole) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(nextRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name: name?.toString().trim() || null,
        email: email.toString().trim().toLowerCase(),
        password: hashPassword(password.toString()),
        role: nextRole,
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}