"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Badge, Button, Card } from "@ecom/ui";
import type { Customer, CustomerOrder } from "@/lib/customer-auth";

function statusVariant(s: string): "gold" | "muted" | "outline" {
  if (["shipped", "delivered", "fulfilled", "captured"].includes(s)) return "gold";
  if (["not_fulfilled", "awaiting", "not_paid"].includes(s)) return "outline";
  return "muted";
}

export function AccountClient({ customer, orders }: { customer: Customer; orders: CustomerOrder[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const input = "h-11 w-full rounded-sm border border-input bg-card px-3 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!res.ok) throw new Error("Could not save");
      setMsg("Profile updated.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <Card className="flex h-fit flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Profile</h2>
          <button onClick={logout} className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{customer.email}</p>
        <div className="grid grid-cols-2 gap-3">
          <input className={input} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className={input} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <input className={input} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button variant="solid" loading={saving} onClick={save} className="w-fit">
          Save changes
        </Button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </Card>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold">Order history</h2>
        {orders.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">You haven’t placed any orders yet.</p>
            <Link href="/products" className="text-sm font-medium underline">Start shopping</Link>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-semibold">#{o.displayId}</td>
                    <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="font-semibold">{o.total}</td>
                    <td><Badge variant={statusVariant(o.fulfillmentStatus)}>{o.fulfillmentStatus.replace(/_/g, " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
