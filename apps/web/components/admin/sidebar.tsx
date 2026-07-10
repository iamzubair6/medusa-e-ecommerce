"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LayoutTemplate, LayoutPanelTop, Navigation, ListFilter, Megaphone, Rocket, ScanSearch, ShoppingBag, Receipt, Tag, TicketPercent, FolderTree, UserRound, Users, ShieldCheck, Settings, LogOut, ExternalLink, ClipboardList, CreditCard, Truck, Smartphone, FileText, Sparkles } from "lucide-react";
import { cn } from "@ecom/ui";
import type { AdminRole } from "@ecom/cms";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Receipt, exact: false },
  { href: "/admin/products", label: "Products", icon: ShoppingBag, exact: false },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, exact: false },
  { href: "/admin/discounts", label: "Discounts", icon: Tag, exact: false },
  { href: "/admin/price-lists", label: "Sales", icon: TicketPercent, exact: false },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, exact: false },
  { href: "/admin/shipping", label: "Shipping", icon: Truck, exact: false },
  { href: "/admin/customers", label: "Customers", icon: UserRound, exact: false },
  { href: "/admin/pages", label: "Pages", icon: LayoutTemplate, exact: false },
  { href: "/admin/landing-style", label: "Landing Style", icon: LayoutPanelTop, exact: false },
  { href: "/admin/content-pages", label: "Content Pages", icon: FileText, exact: false },
  { href: "/admin/shop-the-look", label: "Shop the Look", icon: Sparkles, exact: false },
  { href: "/admin/navigation", label: "Navigation", icon: Navigation, exact: false },
  { href: "/admin/listings", label: "Listings", icon: ListFilter, exact: false },
  { href: "/admin/popups", label: "Popups", icon: Megaphone, exact: false },
  { href: "/admin/phone-popup", label: "Phone Popup", icon: Smartphone, exact: false },
  { href: "/admin/campaigns", label: "Campaigns", icon: Rocket, exact: false },
  { href: "/admin/persona", label: "Persona", icon: ClipboardList, exact: false },
  { href: "/admin/site", label: "Storefront", icon: LayoutTemplate, exact: false },
  { href: "/admin/visual-search", label: "Visual Search", icon: ScanSearch, exact: false },
  { href: "/admin/leads", label: "Guest Leads", icon: Users, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
  { href: "/admin/users", label: "Team & Roles", icon: ShieldCheck, exact: false, adminOnly: true },
] as const;

export function AdminSidebar({ user }: { user: { name: string; role: AdminRole } }) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleItems = items.filter((item) => !("adminOnly" in item && item.adminOnly) || user.role === "ADMIN");

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col self-start border-r border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <span className="font-display text-xl font-medium">Maison</span>
        <span className="ml-2 text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-border p-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
            {user.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
              {user.role === "ADMIN" ? "Admin" : "Editor"}
            </p>
          </div>
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          View store
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
