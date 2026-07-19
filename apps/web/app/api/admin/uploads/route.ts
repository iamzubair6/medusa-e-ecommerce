import { NextResponse } from "next/server";
import { recordMediaAsset } from "@ecom/cms";
import { uploadFiles } from "@/lib/medusa-admin";

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

/** Proxy product image uploads to Medusa's file service (admin-gated). Every
 *  uploaded URL is also recorded in the media library for reuse. */
export async function POST(request: Request) {
  const incoming = await request.formData();
  const files = incoming.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 422 });
  }
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  try {
    const urls = await uploadFiles(form);
    // Best-effort: index each upload for the library (never fails the upload).
    await Promise.all(
      urls.map((url) => recordMediaAsset({ url, type: isVideo(url) ? "VIDEO" : "IMAGE" }).catch(() => null)),
    );
    return NextResponse.json({ urls });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
