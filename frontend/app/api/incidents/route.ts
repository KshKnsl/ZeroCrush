import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestAuth } from '@/lib/server-auth';

function parseIncidentId(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get('id');
  const id = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
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
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const type = typeof body.type === 'string' ? body.type : 'MANUAL';
    const description = typeof body.description === 'string' ? body.description : '';
    const source = typeof body.source === 'string' ? body.source : 'manual';
    const status = body.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN';
    const createdById = auth.userId;

    const incident = await prisma.incident.create({
      data: {
        type: type === 'VIOLENCE' || type === 'RESTRICTED_ZONE' || type === 'ABNORMAL' || type === 'MANUAL' ? type : 'MANUAL',
        description,
        source,
        status,
        createdById,
      },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const id = parseIncidentId(request);
    const { status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const id = parseIncidentId(request);
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.incident.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
}
