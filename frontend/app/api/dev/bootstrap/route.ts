import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';

const INCIDENT_SEEDS = [
  {
    type: 'MANUAL',
    status: 'OPEN',
    description: 'Bootstrap manual incident for the temp admin setup.',
    source: 'bootstrap',
  },
  {
    type: 'VIOLENCE',
    status: 'OPEN',
    description: 'Bootstrap violence incident for the temp admin setup.',
    source: 'bootstrap',
  },
  {
    type: 'RESTRICTED_ZONE',
    status: 'RESOLVED',
    description: 'Bootstrap restricted-zone incident for the temp admin setup.',
    source: 'bootstrap',
  },
  {
    type: 'ABNORMAL',
    status: 'OPEN',
    description: 'Bootstrap abnormal incident for the temp admin setup.',
    source: 'bootstrap',
  },
] as const;

export async function POST() {
  try {
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password: ADMIN_PASSWORD,
        role: 'ADMIN',
      },
      create: {
        name: 'Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    const existingIncidents = await prisma.incident.findMany({
      where: {
        OR: INCIDENT_SEEDS.map((incident) => ({
          type: incident.type,
          description: incident.description,
          source: incident.source,
        })),
      },
      select: { type: true, description: true, source: true },
    });

    const existingKeys = new Set(
      existingIncidents.map((incident) => `${incident.type}::${incident.source}::${incident.description}`),
    );

    const incidentsToCreate = INCIDENT_SEEDS.filter(
      (incident) => !existingKeys.has(`${incident.type}::${incident.source}::${incident.description}`),
    ).map((incident) => ({
      type: incident.type,
      status: incident.status,
      description: incident.description,
      source: incident.source,
      createdById: admin.id,
    }));

    const createdIncidents = incidentsToCreate.length
      ? await prisma.incident.createMany({ data: incidentsToCreate })
      : { count: 0 };

    return NextResponse.json({
      message: 'Bootstrap complete.',
      admin,
      incidentsCreated: createdIncidents.count,
      adminCredentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });
  } catch (error) {
    console.error('[bootstrap] failed', error);
    return NextResponse.json({ message: 'Failed to create bootstrap rows.' }, { status: 500 });
  }
}