"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";

export function ProductActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const published = status === "published";

  const toggle = async () => {
    setBusy("status");
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: published ? "draft" : "published" }),
      });
      if (!res.ok) throw new Error("Could not update status");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this product permanently? This cannot be undone.")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete product");
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-destructive">{error}</span>}
      <Button variant="outline" size="sm" loading={busy === "status"} onClick={toggle}>
        {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {published ? "Unpublish" : "Publish"}
      </Button>
      <Button variant="ghost" size="sm" loading={busy === "delete"} onClick={remove} className="text-destructive hover:bg-destructive/10">
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    </div>
  );
}
