import { z } from "zod";

/** Shared validation for a saved customer address. */
export const addressSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  address1: z.string().min(1).max(120),
  address2: z.string().max(120).optional(),
  city: z.string().min(1).max(60),
  postalCode: z.string().min(1).max(20),
  phone: z.string().max(30).optional(),
  countryCode: z.string().length(2).optional(),
});
