"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button, ConfirmDialog } from "@ecom/ui";
import { useToast } from "./toast";

export function ProductActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const published = status === "published";

  const toggle = async () => {
    setBusy("status");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: published ? "draft" : "published" }),
      });
      if (!res.ok) throw new Error("Could not update status");
      toast.success(published ? "Product unpublished." : "Product published.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete product");
      toast.success("Product deleted.");
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    } finally {
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" loading={busy === "status"} onClick={toggle}>
        {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {published ? "Unpublish" : "Publish"}
      </Button>
      <Button variant="ghost" size="sm" loading={busy === "delete"} onClick={() => setConfirmingDelete(true)} className="text-destructive hover:bg-destructive/10">
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this product permanently?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={busy === "delete"}
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
