import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type UserRole } from '@/lib/auth';

function getCallerRole(request: NextRequest): UserRole | null {
  const role = request.headers.get('x-user-role');
  if (role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER') return role;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const role = getCallerRole(request);
    if (role === null) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ incidents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = getCallerRole(request);
    if (role === null || role === 'VIEWER') {
      return NextResponse.json({ error: 'Operator or admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const type = typeof body.type === 'string' ? body.type : 'MANUAL';
    const description = typeof body.description === 'string' ? body.description : '';
    const source = typeof body.source === 'string' ? body.source : 'manual';
    const status = body.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN';
    const createdById = request.headers.get('x-user-id') ? Number(request.headers.get('x-user-id')) : null;

    const incident = await prisma.incident.create({
      data: {
        type: type === 'VIOLENCE' || type === 'RESTRICTED_ZONE' || type === 'ABNORMAL' || type === 'MANUAL' ? type : 'MANUAL',
        description,
        source,
        status,
        createdById: Number.isFinite(createdById ?? NaN) ? createdById : null,
      },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}
