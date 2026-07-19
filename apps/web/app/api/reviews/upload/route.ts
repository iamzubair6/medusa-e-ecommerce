import { NextResponse } from "next/server";
import { uploadFiles } from "@/lib/medusa-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 4;

/**
 * Public, tightly-limited photo upload for customer reviews. Images only,
 * size- and count-capped, rate-limited. Uploads server-side to the same file
 * service (the admin token never reaches the client).
 */
export async function POST(request: Request) {
  const limit = rateLimit(`review-upload:${clientKey(request)}`, 15, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many uploads — try again shortly." }, { status: 429 });

  const incoming = await request.formData().catch(() => null);
  const files = (incoming?.getAll("files") ?? []).filter((f): f is File => f instanceof File).slice(0, MAX_FILES);
  if (files.length === 0) return NextResponse.json({ error: "No image" }, { status: 422 });
  for (const f of files) {
    if (!f.type.startsWith("image/")) return NextResponse.json({ error: "Images only." }, { status: 422 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: "Each image must be under 5 MB." }, { status: 422 });
  }

  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  try {
    const urls = await uploadFiles(form);
    return NextResponse.json({ urls });
  } catch {
    return NextResponse.json({ error: "Upload failed — try again." }, { status: 502 });
  }
}
