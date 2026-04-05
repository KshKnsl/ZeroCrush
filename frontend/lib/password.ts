import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const HASH_PREFIX = 'scrypt';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  if (!storedPassword.includes('$')) {
    return storedPassword === password;
  }

  const [prefix, salt, hash] = storedPassword.split('$');
  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return storedPassword === password;
  }

  const derivedKey = scryptSync(password, salt, 64);
  const expectedKey = Buffer.from(hash, 'hex');

  if (expectedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedKey, derivedKey);
}

export function isPasswordHash(value: string): boolean {
  return value.startsWith(`${HASH_PREFIX}$`);
}
