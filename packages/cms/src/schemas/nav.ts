import { z } from "zod";
import { mediaRefSchema } from "./primitives";

/** Mega-menu payload attached to a top-level NavItem. */
export const megaMenuSchema = z.object({
  columns: z
    .array(
      z.object({
        heading: z.string().max(40).optional(),
        links: z
          .array(z.object({ label: z.string().min(1).max(40), href: z.string().min(1) }))
          .max(12),
      }),
    )
    .max(4),
  featured: z
    .object({ media: mediaRefSchema, label: z.string().max(40), href: z.string().min(1) })
    .optional(),
});
export type MegaMenu = z.infer<typeof megaMenuSchema>;

/** Announcement bar shown above the navbar. */
export const announcementSchema = z.object({
  active: z.boolean().default(false),
  message: z.string().max(160),
  href: z.string().optional(),
});
export type Announcement = z.infer<typeof announcementSchema>;
