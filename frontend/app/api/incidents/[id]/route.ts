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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getCallerRole(request);
    if (role === 'VIEWER' || role === null) {
      return NextResponse.json({ error: 'Operator or admin access required.' }, { status: 403 });
    }

    const id = parseInt((await params).id, 10);
    const { status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      }
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
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

    const id = parseInt((await params).id, 10);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await prisma.incident.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
}
