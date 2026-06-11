import { listAdminUsers } from "@ecom/cms/admin-users";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminHeader } from "@/components/admin/page-header";
import { UsersManager, type AdminUserRow } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([listAdminUsers(), getAdminSession()]);

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <>
      <AdminHeader
        title="Team & Roles"
        description="Admin accounts that can sign into this panel. Admins manage everything incl. users; editors manage content, catalog and orders."
      />
      <div className="p-8">
        <UsersManager users={rows} currentUserId={session?.uid ?? ""} />
      </div>
    </>
  );
}
