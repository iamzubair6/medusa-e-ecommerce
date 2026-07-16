"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LayoutTemplate, LayoutPanelTop, Navigation, ListFilter, Megaphone, Rocket, ScanSearch, ShoppingBag, Receipt, Tag, TicketPercent, FolderTree, UserRound, Users, ShieldCheck, Settings, LogOut, ExternalLink, ClipboardList, CreditCard, Truck, Smartphone, FileText, FileSpreadsheet, Sparkles, Mail, MessageSquareText, type LucideIcon } from "lucide-react";
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
  /** One-line plain-language hint of what this group is for. */
  description?: string;
  items: NavItem[];
};

/**
 * Ordered by the seller's journey: daily work (orders, customers) first, then
 * the catalog, how the shop looks, marketing, and finally the set-once store
 * configuration (payments/shipping/settings) at the bottom — the Shopify model.
 * A brand-new seller works top-to-bottom within "Set up your store".
 */
const groups: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    heading: "Day to day",
    description: "Orders and shoppers",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/customers", label: "Customers", icon: UserRound },
    ],
  },
  {
    heading: "Catalog",
    description: "Your products & pricing",
    items: [
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/products", label: "Products", icon: ShoppingBag },
      { href: "/admin/products/import", label: "Import products", icon: FileSpreadsheet },
      { href: "/admin/discounts", label: "Discounts", icon: Tag },
      { href: "/admin/price-lists", label: "Sale pricing", icon: TicketPercent },
    ],
  },
  {
    heading: "Storefront",
    description: "How your shop looks",
    items: [
      { href: "/admin/pages", label: "Landing pages", icon: LayoutTemplate },
      { href: "/admin/landing-style", label: "Landing style", icon: LayoutPanelTop },
      { href: "/admin/navigation", label: "Menus & nav", icon: Navigation },
      { href: "/admin/listings", label: "Listing filters", icon: ListFilter },
      { href: "/admin/shop-the-look", label: "Shop the look", icon: Sparkles },
      { href: "/admin/content-pages", label: "Info pages", icon: FileText },
      { href: "/admin/site", label: "Brand & theme", icon: LayoutPanelTop },
    ],
  },
  {
    heading: "Marketing",
    description: "Grow & re-engage",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", icon: Rocket },
      { href: "/admin/popups", label: "Popups", icon: Megaphone },
      { href: "/admin/phone-popup", label: "Phone popup", icon: Smartphone },
      { href: "/admin/email-templates", label: "Email templates", icon: Mail },
      { href: "/admin/sms-templates", label: "SMS templates", icon: MessageSquareText },
      { href: "/admin/persona", label: "Persona quiz", icon: ClipboardList },
      { href: "/admin/leads", label: "Guest leads", icon: Users },
      { href: "/admin/visual-search", label: "Visual search", icon: ScanSearch },
    ],
  },
  {
    heading: "Set up your store",
    description: "Configure once",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: Truck },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/users", label: "Team & roles", icon: ShieldCheck, adminOnly: true },
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
              <p className="px-3 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.heading}
              </p>
              {group.description && (
                <p className="px-3 pb-1.5 text-[0.6875rem] text-muted-foreground/70">{group.description}</p>
              )}
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
