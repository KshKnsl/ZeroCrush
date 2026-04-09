import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  }
}
