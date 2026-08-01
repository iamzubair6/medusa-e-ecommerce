import { z } from "zod";

/** Back-office roles. ADMIN can manage users; EDITOR cannot; STAFF is POS-counter only. */
export const adminRoleSchema = z.enum(["ADMIN", "EDITOR", "STAFF"]);
export type AdminRole = z.infer<typeof adminRoleSchema>;

/** Payload to create a new admin user (password is plaintext here, hashed before write). */
export const adminUserCreateSchema = z.object({
  email: z.string().email("Enter a valid email").max(200),
  name: z.string().min(1, "Name is required").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: adminRoleSchema.default("EDITOR"),
});
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

/** Partial update — any omitted field is left unchanged. */
export const adminUserUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: adminRoleSchema.optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200).optional(),
});
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
