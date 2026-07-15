import { NextResponse } from "next/server";
import { adminConfigured, deleteCustomer } from "@/lib/medusa-admin";

/** Permanently delete a customer (ADMIN-only by middleware — /api/admin/customers/*). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }
  // Destructive endpoint — never let a crafted segment traverse to another admin path.
  if (!/^cus_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid customer id." }, { status: 422 });
  }
  try {
    await deleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete customer." },
      { status: 502 },
    );
  }
}
