import { NextResponse } from "next/server";
import { listProductEmbeddings } from "@ecom/cms";

export const revalidate = 300;

const SAMPLE_COUNT = 4;

/**
 * Random indexed product photos for the "You can try one of these styles
 * below" row in the Search By Image popover. Indexed products only, so a
 * sample click always produces matches.
 */
export async function GET() {
  const all = await listProductEmbeddings();
  const pool = all.filter((e) => e.thumbnail);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const samples = pool.slice(0, SAMPLE_COUNT).map((e) => ({
    thumbnail: e.thumbnail,
    title: e.title,
  }));
  return NextResponse.json({ samples });
}
