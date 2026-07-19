import { NextResponse } from "next/server";
import { z } from "zod";
import { listMediaAssets, deleteMediaAsset } from "@ecom/cms";

/** Recent media assets for the library picker (admin-gated). */
export async function GET(request: Request) {
  const skip = Number(new URL(request.url).searchParams.get("skip")) || 0;
  const assets = await listMediaAssets({ take: 60, skip });
  return NextResponse.json({
    assets: assets.map((a) => ({ id: a.id, url: a.url, type: a.type })),
  });
}

const delSchema = z.object({ id: z.string().min(1).max(120) });

/** Remove an asset from the library (does not delete the underlying file). */
export async function DELETE(request: Request) {
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "id required" }, { status: 422 });
  await deleteMediaAsset(parsed.data.id);
  return NextResponse.json({ ok: true });
}
