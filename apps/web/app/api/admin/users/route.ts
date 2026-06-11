import { NextResponse } from "next/server";
import { adminUserCreateSchema } from "@ecom/cms";
import { createAdminUser, listAdminUsers } from "@ecom/cms/admin-users";
import { requireAdmin } from "@/lib/admin-auth";

/** List all admin users. ADMIN only (middleware-gated; re-checked here). */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ users: await listAdminUsers() });
}

/** Create a new admin user. */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = adminUserCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid user" },
      { status: 422 },
    );
  }
  try {
    const user = await createAdminUser(parsed.data);
    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active } },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
