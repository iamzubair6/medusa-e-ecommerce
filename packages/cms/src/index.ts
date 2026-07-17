import { prisma } from "./client";
import {
  parseSectionConfig,
  defaultSectionConfig,
  megaMenuSchema,
  popupConfigSchema,
  campaignPayloadSchema,
} from "./schemas/index";
import type { SectionTypeKey } from "./schemas/index";

type CampaignStatus = "SCHEDULED" | "ACTIVE" | "ENDED" | "PAUSED";

export { prisma } from "./client";
export * from "./schemas/index";
// NOTE: admin-users uses `node:crypto` (scrypt) and must NOT enter client
// bundles. Import it from "@ecom/cms/admin-users" (server-only) — never here.

/**
 * Fetch a published page layout with its sections in order. Returns null if the
 * page does not exist or is not published.
 */
export async function getPublishedPage(slug: string) {
  const page = await prisma.pageLayout.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!page) return null;
  return page;
}

/** Fetch a nav menu with its items as a nested tree, ordered by position. */
export async function getNavMenu(key: string) {
  const menu = await prisma.navMenu.findUnique({
    where: { key },
    include: {
      items: {
        where: { parentId: null },
        orderBy: { position: "asc" },
        include: { children: { orderBy: { position: "asc" } } },
      },
    },
  });
  return menu;
}

/** The single active popup eligible to show right now (by schedule). */
export async function getActivePopup(now: Date) {
  return prisma.popup.findFirst({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Upsert a guest lead (abandoned info/cart) for remarketing. */
export async function captureGuestLead(input: {
  email?: string;
  phone?: string;
  capturedFields?: Record<string, unknown>;
  cartId?: string;
  source?: string;
}) {
  // Prefer updating an existing lead for the same cart, else by email.
  const existing = input.cartId
    ? await prisma.guestLead.findFirst({ where: { cartId: input.cartId } })
    : input.email
      ? await prisma.guestLead.findFirst({ where: { email: input.email } })
      : null;

  const data = {
    email: input.email ?? null,
    phone: input.phone ?? null,
    capturedFields: (input.capturedFields ?? {}) as object,
    cartId: input.cartId ?? null,
    source: input.source ?? null,
  };

  return existing
    ? prisma.guestLead.update({ where: { id: existing.id }, data })
    : prisma.guestLead.create({ data });
}

/**
 * Validate then persist a section's config. Throws ZodError if invalid — the
 * admin layer should surface this to the editor.
 */
export async function upsertSectionConfig(
  sectionId: string,
  type: SectionTypeKey,
  config: unknown,
) {
  const valid = parseSectionConfig(type, config);
  return prisma.section.update({
    where: { id: sectionId },
    data: { config: valid as object },
  });
}

/** Update a section's config, looking up its type for validation. */
export async function updateSection(sectionId: string, config: unknown) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw new Error("Section not found");
  return upsertSectionConfig(sectionId, section.type as SectionTypeKey, config);
}

/** Create a section (with a valid starter config) at the end of a page. */
export async function createSection(pageLayoutId: string, type: SectionTypeKey) {
  const config = parseSectionConfig(type, defaultSectionConfig(type));
  const count = await prisma.section.count({ where: { pageLayoutId } });
  return prisma.section.create({
    data: { pageLayoutId, type, position: count, config: config as object },
  });
}

/** Delete a section. */
export async function deleteSection(id: string) {
  return prisma.section.delete({ where: { id } });
}

/** Create a new page layout (DRAFT). */
export async function createPage(input: { slug: string; title: string }) {
  return prisma.pageLayout.create({
    data: { slug: input.slug, title: input.title, status: "DRAFT" },
  });
}

/** Persist a new section order for a page (array index becomes position). */
export async function reorderSections(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.section.update({ where: { id }, data: { position: i } })),
  );
}

/** Update a popup's content (validated) plus its activation/schedule. */
export async function updatePopup(
  id: string,
  input: {
    name?: string;
    active?: boolean;
    trigger?: "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";
    config?: unknown;
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.active !== undefined) data.active = input.active;
  if (input.trigger !== undefined) data.trigger = input.trigger;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;
  if (input.config !== undefined) data.config = popupConfigSchema.parse(input.config) as object;
  return prisma.popup.update({ where: { id }, data });
}

/**
 * Replace all items of a nav menu with a new flat list (top-level items only;
 * mega-menu payloads validated). Used by the admin navigation editor.
 */
export async function replaceNavItems(
  key: string,
  items: { label: string; href: string; megaMenu?: unknown }[],
) {
  const menu = await prisma.navMenu.findUnique({ where: { key } });
  if (!menu) throw new Error("Menu not found");
  const prepared = items.map((it, i) => ({
    label: it.label,
    href: it.href,
    position: i,
    megaMenu: it.megaMenu ? (megaMenuSchema.parse(it.megaMenu) as object) : undefined,
  }));
  await prisma.$transaction([
    prisma.navItem.deleteMany({ where: { menuId: menu.id } }),
    ...prepared.map((it) => prisma.navItem.create({ data: { ...it, menuId: menu.id } })),
  ]);
}

// --- Campaigns ("runs") -----------------------------------------------------

export async function listCampaigns() {
  return prisma.campaign.findMany({ orderBy: { startsAt: "desc" } });
}

export async function createCampaign(input: {
  name: string;
  status: CampaignStatus;
  startsAt: Date;
  endsAt?: Date | null;
  payload?: unknown;
}) {
  return prisma.campaign.create({
    data: {
      name: input.name,
      status: input.status,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      payload: campaignPayloadSchema.parse(input.payload ?? {}) as object,
    },
  });
}

export async function updateCampaign(
  id: string,
  input: {
    name?: string;
    status?: CampaignStatus;
    startsAt?: Date;
    endsAt?: Date | null;
    payload?: unknown;
  },
) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;
  if (input.payload !== undefined) data.payload = campaignPayloadSchema.parse(input.payload) as object;
  return prisma.campaign.update({ where: { id }, data });
}

export async function deleteCampaign(id: string) {
  return prisma.campaign.delete({ where: { id } });
}

// --- Visual search embeddings ----------------------------------------------

export interface EmbeddingInput {
  productId: string;
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
  dim: number;
  vector: number[];
}

export async function upsertProductEmbedding(input: EmbeddingInput) {
  return prisma.productEmbedding.upsert({
    where: { productId: input.productId },
    create: input,
    update: { ...input },
  });
}

export async function listProductEmbeddings() {
  return prisma.productEmbedding.findMany();
}

export async function getProductEmbedding(productId: string) {
  return prisma.productEmbedding.findUnique({ where: { productId } });
}

export async function countProductEmbeddings() {
  return prisma.productEmbedding.count();
}

/** Remove embeddings for products no longer in the index (e.g. unpriced/removed). */
export async function pruneProductEmbeddings(keepProductIds: string[]) {
  return prisma.productEmbedding.deleteMany({ where: { productId: { notIn: keepProductIds } } });
}

/** Remove one product's embedding (product deleted/unpublished). */
export async function deleteProductEmbedding(productId: string) {
  return prisma.productEmbedding.deleteMany({ where: { productId } });
}

// --- Product reviews --------------------------------------------------------

export async function createReview(input: {
  productHandle: string;
  rating: number;
  author: string;
  title?: string;
  body: string;
}) {
  return prisma.productReview.create({
    data: {
      productHandle: input.productHandle,
      rating: Math.max(1, Math.min(5, Math.round(input.rating))),
      author: input.author,
      title: input.title ?? null,
      body: input.body,
    },
  });
}

/** Approved reviews for a product (newest first), paginated. */
export async function listReviews(productHandle: string, opts: { skip?: number; take?: number } = {}) {
  const take = Math.min(opts.take ?? 20, 50);
  const skip = opts.skip ?? 0;
  const [items, total] = await Promise.all([
    prisma.productReview.findMany({
      where: { productHandle, approved: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.productReview.count({ where: { productHandle, approved: true } }),
  ]);
  return { items, total, skip, take };
}

/** Aggregate rating for a product: count + average (rounded to 1 dp). */
export async function getReviewSummary(productHandle: string) {
  const agg = await prisma.productReview.aggregate({
    where: { productHandle, approved: true },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const count = agg._count._all;
  return { count, average: count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0 };
}

/** Paginated guest leads (newest first). */
export async function listGuestLeads(opts: { skip?: number; take?: number } = {}) {
  const take = Math.min(opts.take ?? 25, 100);
  const skip = opts.skip ?? 0;
  const [items, total] = await Promise.all([
    prisma.guestLead.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    prisma.guestLead.count(),
  ]);
  return { items, total, skip, take };
}

// ---------------------------------------------------------------------------
// Phone OTP (passwordless capture + registration verify)
// ---------------------------------------------------------------------------

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

/** Create a 6-digit OTP for a phone; replaces any prior pending challenge. */
export async function requestOtp(phone: string): Promise<{ code: string; expiresAt: Date }> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.otpChallenge.deleteMany({ where: { phone } });
  await prisma.otpChallenge.create({ data: { phone, code, expiresAt } });
  return { code, expiresAt };
}

/**
 * Verify an OTP. Returns true on success (and marks it verified). A correct,
 * unexpired code stays verifiable until expiry — so when the step AFTER
 * verification fails (e.g. the store backend was down mid-registration), the
 * user can retry without the code being burned.
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return false;
  if (challenge.expiresAt < new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
    return false;
  }
  if (challenge.code !== code) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  if (!challenge.verified) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { verified: true } });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Site settings (editable announcement, marquee, brands, persona, etc.)
// ---------------------------------------------------------------------------

export async function getSiteSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return (row?.value as T) ?? null;
}

export async function setSiteSetting(key: string, value: unknown): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
