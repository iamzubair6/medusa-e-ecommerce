"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, TicketPercent, Send, Phone } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { useToast } from "./toast";

export interface AbandonedRow {
  id: string;
  email: string;
  itemCount: number;
  total: string;
  reminded: boolean;
  updatedAt: string;
  items: { title: string; quantity: number; thumbnail: string | null }[];
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

/** Abandoned-cart recovery centre: incentive config, per-row recovery emails
 *  with cart contents preview, and a bulk send to everyone not yet reminded. */
export function AbandonedCartsClient({ rows, discountPercent }: { rows: AbandonedRow[]; discountPercent: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [percentDraft, setPercentDraft] = useState(String(discountPercent));
  const [savingPercent, setSavingPercent] = useState(false);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  const sendOne = async (id: string): Promise<void> => {
    const res = await fetch("/api/admin/abandoned-carts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? "Send failed");
    }
  };

  const send = async (id: string) => {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await sendOne(id);
      toast.success("Recovery email sent.");
      setSent((s) => new Set(s).add(id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  };

  const unreminded = rows.filter((r) => !r.reminded && !sent.has(r.id));

  const sendBulk = async () => {
    setConfirmingBulk(false);
    setBulkRunning(true);
    let ok = 0;
    for (const r of unreminded) {
      try {
        await sendOne(r.id);
        ok += 1;
        setSent((s) => new Set(s).add(r.id));
      } catch {
        /* keep going; report the total below */
      }
    }
    setBulkRunning(false);
    toast.success(`Recovery sent to ${ok} of ${unreminded.length} carts.`);
    router.refresh();
  };

  // Support-call flow (#141): fetch/create the cart's one-time code and copy it
  // so an agent can read it to the customer on the phone.
  const [fetchingCode, setFetchingCode] = useState<string | null>(null);
  const getCode = async (id: string) => {
    setFetchingCode(id);
    try {
      const res = await fetch("/api/admin/abandoned-carts/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = (await res.json().catch(() => ({}))) as { code?: string; percent?: number; error?: string };
      if (!res.ok || !d.code) throw new Error(d.error ?? "Could not get the code");
      await navigator.clipboard.writeText(d.code).catch(() => undefined);
      toast.success(`${d.code} — ${d.percent}% off, one-time. Copied to clipboard.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFetchingCode(null);
    }
  };

  const savePercent = async () => {
    const n = Number(percentDraft);
    if (!Number.isInteger(n) || n < 0 || n > 90) return toast.error("Enter 0–90 (0 = no discount).");
    setSavingPercent(true);
    try {
      const res = await fetch("/api/admin/abandoned-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercent: n }),
      });
      if (!res.ok) throw new Error("Could not save");
      toast.success(n > 0 ? `Recovery emails now include ${n}% off.` : "Recovery emails carry no discount.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPercent(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-3 p-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <TicketPercent className="h-4 w-4" /> Recovery incentive
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            label="Discount in recovery emails (%; 0 = none)"
            type="number"
            value={percentDraft}
            onChange={(e) => setPercentDraft(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="sm" loading={savingPercent} onClick={savePercent}>
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each cart gets its own one-time code (AB-XXXXXX) — resending reuses the same code, so nobody
          can stack discounts. The email text is editable in Email templates → Abandoned cart recovery.
        </p>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No abandoned carts right now. Carts show up here ~30 min after a shopper enters their email
          at checkout without completing the order.
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rows.length} cart{rows.length === 1 ? "" : "s"} · {unreminded.length} not yet reminded
            </p>
            <Button
              variant="gold"
              size="sm"
              disabled={unreminded.length === 0}
              loading={bulkRunning}
              onClick={() => setConfirmingBulk(true)}
            >
              <Send className="mr-1 h-4 w-4" /> Send to all unreminded ({unreminded.length})
            </Button>
          </div>

          <Card className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                {r.items[0]?.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.items[0].thumbnail} alt="" className="h-12 w-10 shrink-0 rounded-sm object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.items.length > 0
                      ? r.items.map((i) => `${i.quantity}× ${i.title}`).join(" · ")
                      : `${r.itemCount} item${r.itemCount === 1 ? "" : "s"}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.total ? `${r.total} · ` : ""}
                    {ago(r.updatedAt)}
                    {r.reminded && " · reminded"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={fetchingCode === r.id}
                  onClick={() => getCode(r.id)}
                  title="Get this cart's one-time discount code (for a support call)"
                >
                  <Phone className="mr-1 h-4 w-4" /> Code
                </Button>
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
        </>
      )}

      <ConfirmDialog
        open={confirmingBulk}
        title={`Email ${unreminded.length} shopper${unreminded.length === 1 ? "" : "s"}?`}
        description={
          discountPercent > 0
            ? `Each gets the recovery email with their own one-time ${discountPercent}% code.`
            : "Each gets the recovery email (no discount configured)."
        }
        confirmLabel="Send all"
        loading={bulkRunning}
        onConfirm={sendBulk}
        onCancel={() => setConfirmingBulk(false)}
      />
    </div>
  );
}
