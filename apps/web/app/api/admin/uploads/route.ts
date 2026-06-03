import { NextResponse } from "next/server";
import { uploadFiles } from "@/lib/medusa-admin";

/** Proxy product image uploads to Medusa's file service (admin-gated). */
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
    return NextResponse.json({ urls });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
