import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type UserRole } from '@/lib/auth';

function getCallerRole(request: NextRequest): UserRole | null {
  const role = request.headers.get('x-user-role');
  if (role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER') {
    return role;
  }
  return null;
}

function canEditEvents(role: UserRole | null) {
  return role === 'ADMIN' || role === 'OPERATOR';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getCallerRole(request);
    if (!canEditEvents(role)) {
      return NextResponse.json({ error: 'Operator or admin access required.' }, { status: 403 });
    }

    const id = Number((await params).id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid event id.' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === 'string') updates.name = body.name.trim();
    if (typeof body.description !== 'undefined') updates.description = body.description?.toString().trim() || null;
    if (typeof body.location !== 'undefined') updates.location = body.location?.toString().trim() || null;
    if (typeof body.capacity !== 'undefined') updates.capacity = Math.max(0, Number(body.capacity) || 0);
    if (typeof body.date !== 'undefined') updates.date = new Date(body.date);

    const event = await prisma.event.update({
      where: { id },
      data: updates,
      include: {
        _count: { select: { registrations: true } },
      },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        date: event.date,
        capacity: event.capacity,
        createdAt: event.createdAt,
        registrationsCount: event._count.registrations,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getCallerRole(request);
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const id = Number((await params).id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid event id.' }, { status: 400 });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event.' }, { status: 500 });
  }
}