import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSiteSetting, setSiteSetting } from "@ecom/cms";
import { contentPagesSchema, parseContentPages, sanitizePageHtml } from "@/lib/content-pages";

/** Save the admin-managed content pages (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = contentPagesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid pages" }, { status: 422 });
  }

  const previous = parseContentPages(await getSiteSetting("contentPages").catch(() => null));
  const next = {
    pages: parsed.data.pages.map((page) => ({ ...page, body: sanitizePageHtml(page.body) })),
  };
  await setSiteSetting("contentPages", next);

  // Old + new slugs: edits show immediately and removed/renamed pages 404 without waiting out ISR.
  const slugs = new Set([...previous.pages, ...next.pages].map((p) => p.slug));
  for (const slug of slugs) revalidatePath(`/${slug}`);

  return NextResponse.json({ ok: true });
}
