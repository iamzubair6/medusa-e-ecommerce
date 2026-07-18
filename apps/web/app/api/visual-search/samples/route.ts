import { NextResponse } from "next/server";
import { listProductEmbeddings } from "@ecom/cms";
import { shuffle } from "@/lib/search-panel";

export const revalidate = 300;

const SAMPLE_COUNT = 4;

/**
 * Random indexed product photos for the "You can try one of these styles
 * below" row in the Search By Image popover. Indexed products only, so a
 * sample click always produces matches.
 */
export async function GET() {
  const all = await listProductEmbeddings();
  const samples = shuffle(all.filter((e) => e.thumbnail))
    .slice(0, SAMPLE_COUNT)
    .map((e) => ({ thumbnail: e.thumbnail, title: e.title }));
  return NextResponse.json({ samples });
}
