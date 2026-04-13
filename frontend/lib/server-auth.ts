import type { NextRequest } from 'next/server';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { sendLoginMail } from '@/lib/mailer';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  OPERATOR: 'Operator',
  VIEWER: 'Viewer',
};

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET;
const ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'] as const;

export type RequestAuth = {
  userId: number;
  role: UserRole;
};

function normalizeRole(value: unknown): UserRole | null {
  return typeof value === 'string' && ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

function toRequestAuth(userIdValue: unknown, roleValue: unknown): RequestAuth | null {
  const role = normalizeRole(roleValue);
  const userId = Number(userIdValue);
  if (!role || !Number.isFinite(userId) || userId <= 0) return null;
  return { userId, role };
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase() ?? '';
        const password = credentials?.password?.toString() ?? '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, password: true, role: true },
        });

        if (!user || user.password !== password) return null;

        sendLoginMail({ to: user.email, name: user.name, role: user.role }).catch((mailError) => {
          console.error('[auth] mail send failed', mailError);
        });

        return { id: String(user.id), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRole(user.role) ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? '');
        session.user.role = normalizeRole(token.role) ?? undefined;
      }
      return session;
    },
  },
};

export async function getRequestAuth(request: NextRequest): Promise<RequestAuth | null> {
  const token = await getToken({ req: request, secret: AUTH_SECRET });
  const tokenAuth = token ? toRequestAuth(token.id ?? token.sub, token.role) : null;
  if (tokenAuth) {
    return tokenAuth;
  }

  const session = await getServerSession(authOptions);
  return toRequestAuth(session?.user?.id, session?.user?.role);
}
