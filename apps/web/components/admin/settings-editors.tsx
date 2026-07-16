"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Radio, RotateCcw, Pencil, Check, X } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog } from "@ecom/ui";
import { useToast } from "./toast";

interface Reason {
  id: string;
  label: string;
}
interface Channel {
  id: string;
  name: string;
  enabled: boolean;
}

function useCall() {
  const router = useRouter();
  const toast = useToast();
  return async (url: string, init: RequestInit, done: string) => {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Action failed");
      }
      toast.success(done);
      router.refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

export function ReasonsEditor({ returnReasons, refundReasons }: { returnReasons: Reason[]; refundReasons: Reason[] }) {
  const call = useCall();
  const toast = useToast();
  const [ret, setRet] = useState("");
  const [ref, setRef] = useState("");
  const [pendingDelete, setPendingDelete] = useState<
    { kind: "return-reasons" | "refund-reasons"; id: string; label: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const addReturn = async () => {
    if (!ret.trim()) return toast.error("Add a reason.");
    if (await call("/api/admin/return-reasons", json("POST", { label: ret }), "Return reason added.")) setRet("");
  };
  const addRefund = async () => {
    if (!ref.trim()) return toast.error("Add a reason.");
    if (await call("/api/admin/refund-reasons", json("POST", { label: ref }), "Refund reason added.")) setRef("");
  };

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <RotateCcw className="h-4 w-4" /> Return & refund reasons
      </h3>

      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">Return reasons</p>
      <Row
        value={ret}
        setValue={setRet}
        onAdd={addReturn}
        placeholder="Wrong size"
        items={returnReasons}
        onDelete={(id, label) => setPendingDelete({ kind: "return-reasons", id, label })}
      />

      <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">Refund reasons</p>
      <Row
        value={ref}
        setValue={setRef}
        onAdd={addRefund}
        placeholder="Damaged"
        items={refundReasons}
        onDelete={(id, label) => setPendingDelete({ kind: "refund-reasons", id, label })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.label ?? ""}"?`}
        description={
          pendingDelete?.kind === "return-reasons"
            ? "The reason is no longer offered when processing returns."
            : "The reason is no longer offered when processing refunds."
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setDeleting(true);
          try {
            await call(`/api/admin/${pendingDelete.kind}/${pendingDelete.id}`, json("DELETE"), "Deleted.");
          } finally {
            setDeleting(false);
            setPendingDelete(null);
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  );
}

function Row({
  value,
  setValue,
  onAdd,
  placeholder,
  items,
  onDelete,
}: {
  value: string;
  setValue: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  items: Reason[];
  onDelete: (id: string, label: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={placeholder}
          className="h-9 flex-1 rounded-sm border border-input bg-card px-2.5 text-sm"
        />
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <ul className="flex flex-col">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
            <span>{r.label}</span>
            <button onClick={() => onDelete(r.id, r.label)} className="cursor-pointer p-1 text-muted-foreground hover:text-destructive" aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="py-1.5 text-sm text-muted-foreground">None yet.</li>}
      </ul>
    </>
  );
}

export function SalesChannelsEditor({ channels }: { channels: Channel[] }) {
  const call = useCall();
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  return (
    <Card className="flex flex-col gap-2 p-5">
      <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Radio className="h-4 w-4" /> Sales channels
      </h3>
      {channels.map((c) => (
        <div key={c.id} className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-0">
          {editing?.id === c.id ? (
            <>
              <input
                autoFocus
                value={editing.value}
                onChange={(e) => setEditing({ id: c.id, value: e.target.value })}
                className="h-9 flex-1 rounded-sm border border-input bg-card px-2.5"
              />
              <button
                onClick={async () => {
                  if (editing.value.trim() && (await call(`/api/admin/sales-channels/${c.id}`, json("PATCH", { name: editing.value }), "Renamed.")))
                    setEditing(null);
                }}
                className="cursor-pointer p-1 text-gold"
                aria-label="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setEditing(null)} className="cursor-pointer p-1 text-muted-foreground" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 font-medium">{c.name}</span>
              <Badge variant={c.enabled ? "gold" : "muted"}>{c.enabled ? "enabled" : "disabled"}</Badge>
              <button onClick={() => setEditing({ id: c.id, value: c.name })} className="cursor-pointer p-1 text-muted-foreground hover:text-foreground" aria-label="Rename">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => call(`/api/admin/sales-channels/${c.id}`, json("PATCH", { isDisabled: c.enabled }), c.enabled ? "Disabled." : "Enabled.")}
                className="cursor-pointer px-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {c.enabled ? "Disable" : "Enable"}
              </button>
            </>
          )}
        </div>
      ))}
      {channels.length === 0 && <p className="py-2 text-sm text-muted-foreground">No sales channels.</p>}
    </Card>
  );
}
