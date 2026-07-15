"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { useToast } from "./toast";

/**
 * Permanently delete a customer (ADMIN-only endpoint). Used both as a row
 * action in the customers table (icon only) and on the detail page (labeled);
 * `redirectTo` sends the admin back to the list after deleting from detail.
 */
export function CustomerDeleteButton({
  id,
  name,
  redirectTo,
  iconOnly = false,
}: {
  id: string;
  name: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!confirm(`Delete ${name} permanently? Their orders are kept, but the account cannot be restored.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not delete customer");
      }
      toast.success("Customer deleted.");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete customer");
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      onClick={remove}
      aria-label={`Delete ${name}`}
      className="text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
      {!iconOnly && "Delete customer"}
    </Button>
  );
}
