import { NextResponse } from "next/server";
import { z } from "zod";
import { setProductStatus, deleteProduct } from "@/lib/medusa-admin";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(["publish", "unpublish", "delete"]),
});

/** Apply a bulk action to selected products (admin-gated). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const { ids, action } = parsed.data;

  let done = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      if (action === "delete") await deleteProduct(id);
      else await setProductStatus(id, action === "publish" ? "published" : "draft");
      done += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ done, failed });
}
