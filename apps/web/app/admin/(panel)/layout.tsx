import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { ToastProvider } from "@/components/admin/toast";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth — middleware already gates, but never render the panel unauthed.
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-muted/40">
        <AdminSidebar user={{ name: session.name, role: session.role }} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </ToastProvider>
  );
}
