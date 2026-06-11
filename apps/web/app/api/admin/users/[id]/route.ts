import { NextResponse } from "next/server";
import { adminUserUpdateSchema } from "@ecom/cms";
import {
  countActiveAdmins,
  deleteAdminUser,
  getAdminUserById,
  updateAdminUser,
} from "@ecom/cms/admin-users";
import { requireAdmin } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * Whether this change would remove the last remaining active ADMIN — which
 * would lock everyone out of user management. Such changes are rejected.
 */
async function wouldOrphanAdmins(
  target: { role: string; active: boolean },
  next: { role?: string; active?: boolean },
): Promise<boolean> {
  const isActiveAdmin = target.role === "ADMIN" && target.active;
  if (!isActiveAdmin) return false;
  const losesAdmin = next.role === "EDITOR" || next.active === false;
  if (!losesAdmin) return false;
  return (await countActiveAdmins()) <= 1;
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const target = await getAdminUserById(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const parsed = adminUserUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update" },
      { status: 422 },
    );
  }
  if (await wouldOrphanAdmins(target, parsed.data)) {
    return NextResponse.json(
      { error: "You can't demote or deactivate the last active admin." },
      { status: 422 },
    );
  }

  const user = await updateAdminUser(id, parsed.data);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const target = await getAdminUserById(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (await wouldOrphanAdmins(target, { active: false })) {
    return NextResponse.json({ error: "You can't delete the last active admin." }, { status: 422 });
  }

  await deleteAdminUser(id);
  return NextResponse.json({ ok: true });
}
