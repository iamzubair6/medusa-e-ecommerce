"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LayoutTemplate, LayoutPanelTop, Navigation, ListFilter, Megaphone, Rocket, ScanSearch, ShoppingBag, Receipt, Tag, TicketPercent, FolderTree, UserRound, Users, ShieldCheck, Settings, LogOut, ExternalLink, ClipboardList, CreditCard, Truck, Smartphone, FileText, FileSpreadsheet, Sparkles, Mail, type LucideIcon } from "lucide-react";
import { cn } from "@ecom/ui";
import type { AdminRole } from "@ecom/cms";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    heading: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/customers", label: "Customers", icon: UserRound },
      { href: "/admin/discounts", label: "Discounts", icon: Tag },
      { href: "/admin/price-lists", label: "Sales", icon: TicketPercent },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/shipping", label: "Shipping", icon: Truck },
    ],
  },
  {
    heading: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: ShoppingBag },
      { href: "/admin/products/import", label: "Import Products", icon: FileSpreadsheet },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: LayoutTemplate },
      { href: "/admin/landing-style", label: "Landing Style", icon: LayoutPanelTop },
      { href: "/admin/content-pages", label: "Content Pages", icon: FileText },
      { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
      { href: "/admin/navigation", label: "Navigation", icon: Navigation },
      { href: "/admin/listings", label: "Listings", icon: ListFilter },
      { href: "/admin/shop-the-look", label: "Shop the Look", icon: Sparkles },
      { href: "/admin/site", label: "Storefront", icon: LayoutTemplate },
    ],
  },
  {
    heading: "Marketing",
    items: [
      { href: "/admin/popups", label: "Popups", icon: Megaphone },
      { href: "/admin/phone-popup", label: "Phone Popup", icon: Smartphone },
      { href: "/admin/campaigns", label: "Campaigns", icon: Rocket },
      { href: "/admin/persona", label: "Persona", icon: ClipboardList },
      { href: "/admin/leads", label: "Guest Leads", icon: Users },
      { href: "/admin/visual-search", label: "Visual Search", icon: ScanSearch },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/users", label: "Team & Roles", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

export function AdminSidebar({ user }: { user: { name: string; role: AdminRole } }) {
  const pathname = usePathname();
  const router = useRouter();

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
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || user.role === "ADMIN");
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.heading}>
              <p className="px-3 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.heading}
              </p>
              <div className="flex flex-col gap-1">
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
              </div>
            </div>
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
