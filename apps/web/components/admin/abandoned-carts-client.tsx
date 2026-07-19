"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { useToast } from "./toast";

export interface AbandonedRow {
  id: string;
  email: string;
  itemCount: number;
  total: string;
  reminded: boolean;
  updatedAt: string;
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

/** Abandoned-cart list with a one-click recovery email per row. */
export function AbandonedCartsClient({ rows }: { rows: AbandonedRow[] }) {
  const toast = useToast();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Set<string>>(new Set());

  const send = async (id: string) => {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch("/api/admin/abandoned-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: boolean; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Send failed");
      toast.success(d.sent ? "Recovery email sent." : "Marked reminded (email is off).");
      setSent((s) => new Set(s).add(id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  };

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No abandoned carts right now. Carts show up here ~30 min after a shopper enters their email
        at checkout without completing the order.
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl divide-y divide-border">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.email}</p>
            <p className="text-xs text-muted-foreground">
              {r.itemCount} item{r.itemCount === 1 ? "" : "s"}
              {r.total ? ` · ${r.total}` : ""} · {ago(r.updatedAt)}
              {r.reminded && " · reminded"}
            </p>
          </div>
          <Button
            variant="gold"
            size="sm"
            disabled={sent.has(r.id)}
            loading={pending[r.id]}
            onClick={() => send(r.id)}
          >
            <Mail className="mr-1 h-4 w-4" />
            {sent.has(r.id) ? "Sent" : r.reminded ? "Send again" : "Send recovery"}
          </Button>
        </div>
      ))}
    </Card>
  );
}
