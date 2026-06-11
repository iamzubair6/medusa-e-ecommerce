import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./client";
import {
  adminUserCreateSchema,
  adminUserUpdateSchema,
  type AdminUserCreateInput,
  type AdminUserUpdateInput,
} from "./schemas/admin-user";

const SCRYPT_KEYLEN = 64;

/** Hash a plaintext password as `scrypt$<salt>$<hash>` (no external deps). */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/** Constant-time verify of a plaintext password against a stored scrypt hash. */
export function verifyPasswordHash(plain: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export async function countAdminUsers(): Promise<number> {
  return prisma.adminUser.count();
}

/** Number of active ADMIN-role users — used to prevent locking out the last admin. */
export async function countActiveAdmins(): Promise<number> {
  return prisma.adminUser.count({ where: { role: "ADMIN", active: true } });
}

export async function listAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function getAdminUserById(id: string) {
  return prisma.adminUser.findUnique({ where: { id } });
}

export async function getAdminUserByEmail(email: string) {
  return prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
}

export async function createAdminUser(input: AdminUserCreateInput) {
  const data = adminUserCreateSchema.parse(input);
  return prisma.adminUser.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      passwordHash: hashPassword(data.password),
    },
  });
}

export async function updateAdminUser(id: string, input: AdminUserUpdateInput) {
  const data = adminUserUpdateSchema.parse(input);
  return prisma.adminUser.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.password !== undefined ? { passwordHash: hashPassword(data.password) } : {}),
    },
  });
}

export async function deleteAdminUser(id: string) {
  return prisma.adminUser.delete({ where: { id } });
}

/** Stamp the last successful login time. */
export async function markAdminLogin(id: string) {
  return prisma.adminUser.update({ where: { id }, data: { lastLoginAt: new Date() } });
}

/**
 * Authenticate by email + password. Returns the user on success, or null if no
 * such user, the account is inactive, or the password does not match.
 */
export async function authenticateAdmin(email: string, password: string) {
  const user = await getAdminUserByEmail(email);
  if (!user || !user.active) return null;
  if (!verifyPasswordHash(password, user.passwordHash)) return null;
  return user;
}
