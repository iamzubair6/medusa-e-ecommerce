import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { getSiteSetting } from "@ecom/cms";
import { detectQueryContext } from "@/lib/garment-detect";
import { similarCardsByVector } from "@/lib/visual-search";
import { listCategories } from "@/lib/commerce";
import { parseVisualSearchSettings } from "@/lib/visual-search-settings";
import { fetchSafeImage } from "@/lib/safe-image-fetch";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({ imageUrl: z.string().url().max(2048) });

/**
 * Auto-tag a Shop-the-Look photo: run it through the same garment detector as
 * visual search, then suggest the best-matching catalog product for each
 * detected piece. Returns hotspots (percent coords + suggested product) the
 * admin can accept or tweak — no manual clicking/searching required.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`autotag:${clientKey(request)}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests — try again shortly." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid image URL is required." }, { status: 422 });
  }

  // Same SSRF-vetted fetch as the public visual-search route.
  const raw = await fetchSafeImage(parsed.data.imageUrl);
  if (!raw) {
    return NextResponse.json({ error: "Couldn't load that photo." }, { status: 422 });
  }
  let stored: Buffer;
  try {
    stored = await sharp(raw)
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Couldn't read that photo." }, { status: 422 });
  }

  const { parts } = await detectQueryContext(stored).catch(() => ({ parts: [] }));
  if (parts.length === 0) {
    return NextResponse.json({ hotspots: [], message: "No wearable items detected in this photo." });
  }

  const [settingRaw, cats] = await Promise.all([
    getSiteSetting("visualSearch").catch(() => null),
    listCategories(),
  ]);
  const partCats = parseVisualSearchSettings(settingRaw).partCategories;
  const live = new Set(cats.map((c) => c.handle));

  // For each garment, the closest on-category product becomes the suggestion.
  const hotspots = await Promise.all(
    parts.map(async (p) => {
      const categories = (partCats[p.label] ?? []).filter((h) => live.has(h));
      const [best] = await similarCardsByVector(p.vector, 1, categories);
      return {
        x: Math.round(p.cx * 1000) / 10,
        y: Math.round(p.cy * 1000) / 10,
        label: best?.title ?? "",
        productHandle: best?.handle ?? "",
        suggestionTitle: best?.title ?? "",
      };
    }),
  );

  return NextResponse.json({ hotspots });
}
