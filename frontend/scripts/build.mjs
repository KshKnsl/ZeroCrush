import { execSync } from 'node:child_process';

const isVercel = process.env.VERCEL === '1';

try {
  execSync('pnpm prisma migrate deploy', { stdio: 'inherit' });
} catch (error) {
  if (isVercel) {
    throw error;
  }

  console.warn('[build] prisma migrate deploy failed locally; continuing with next build.');
}

execSync('pnpm next build', { stdio: 'inherit' });
