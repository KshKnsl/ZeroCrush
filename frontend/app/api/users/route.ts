import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestAuth } from '@/lib/server-auth';

function parseUserId(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get('id');
  const id = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function countOtherAdmins(excludeUserId: number) {
  return prisma.user.count({ where: { role: 'ADMIN', id: { not: excludeUserId } } });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
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
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
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
        password: password.toString(),
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

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const targetId = parseUserId(request);
    if (!targetId) {
      return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, password: true, role: true, createdAt: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (auth.userId === targetId) {
      return NextResponse.json({ error: 'You cannot modify your own account with this action.' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      updates.name = body.name.trim() || null;
    }

    if (typeof body.password === 'string' && body.password.length > 0) {
      updates.password = body.password;
    }

    if (typeof body.role === 'string') {
      if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
      }

      if (currentUser.role === 'ADMIN' && body.role !== 'ADMIN') {
        const remainingAdmins = await countOtherAdmins(targetId);
        if (remainingAdmins === 0) {
          return NextResponse.json({ error: 'At least one admin account must remain.' }, { status: 400 });
        }
      }

      updates.role = body.role;
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const targetId = parseUserId(request);
    if (!targetId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    if (auth.userId === targetId) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, password: true, role: true, createdAt: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (target.role === 'ADMIN') {
      const remainingAdmins = await countOtherAdmins(targetId);
      if (remainingAdmins === 0) {
        return NextResponse.json({ error: 'At least one admin account must remain.' }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id: targetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}