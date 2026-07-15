"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, MessageSquareText } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import type { AdminCustomerRow } from "@/lib/medusa-admin";
import { CustomerDeleteButton } from "./customer-delete-button";
import { CustomersSmsComposer } from "./customers-sms-composer";

/**
 * Customers table with row selection (customers with a phone only), a promo-SMS
 * composer, and a CSV export of the full customer list.
 */
export function CustomersTable({
  customers,
  canDelete = false,
}: {
  customers: AdminCustomerRow[];
  /** Deleting is ADMIN-role only — the endpoint enforces it, this hides the affordance. */
  canDelete?: boolean;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);

  // Only customers with a phone number can receive SMS, so only they are selectable.
  const selectable = useMemo(() => customers.filter((c) => c.phone), [customers]);
  const allOnPageSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of selectable) {
        if (allOnPageSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selected.size > 0
            ? `${selected.size} customer${selected.size === 1 ? "" : "s"} selected`
            : "Select rows to target a promo SMS, or send to everyone with a phone."}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/customers/export">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
          <Button variant="solid" size="sm" onClick={() => setComposerOpen((o) => !o)}>
            <MessageSquareText className="h-3.5 w-3.5" /> Send promo SMS
          </Button>
        </div>
      </div>

      {composerOpen && (
        <CustomersSmsComposer selectedIds={[...selected]} onClose={() => setComposerOpen(false)} />
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
              <th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all customers on this page"
                  className="h-4 w-4 cursor-pointer accent-[hsl(var(--accent))] disabled:cursor-not-allowed"
                  checked={allOnPageSelected}
                  disabled={selectable.length === 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Joined</th>
              {canDelete && (
                <th className="w-10">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 [&>td]:px-4 [&>td]:py-3"
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.name}`}
                    title={c.phone ? undefined : "No phone number"}
                    className="h-4 w-4 cursor-pointer accent-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-40"
                    checked={selected.has(c.id)}
                    disabled={!c.phone}
                    onChange={() => toggleOne(c.id)}
                  />
                </td>
                <td className="font-medium">
                  <Link href={`/admin/customers/${c.id}`} className="hover:text-accent">
                    {c.name}
                  </Link>
                </td>
                <td className="text-muted-foreground">{c.email ?? "—"}</td>
                <td className="text-muted-foreground">{c.phone ?? "—"}</td>
                <td>{c.orders}</td>
                <td className="text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                {canDelete && (
                  <td>
                    <CustomerDeleteButton id={c.id} name={c.name} iconOnly />
                  </td>
                )}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
