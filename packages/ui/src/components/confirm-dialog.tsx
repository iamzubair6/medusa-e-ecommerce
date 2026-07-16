"use client";

import { useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import { Card } from "./card";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Plain-language consequence of confirming (shown under the title). */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button for irreversible actions (delete etc.). */
  destructive?: boolean;
  /** Shows a spinner on the confirm button while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Design-system replacement for window.confirm(): a centred modal with an
 * explicit cancel/confirm pair. Cancel is focused by default so Enter never
 * destroys anything by accident; Escape and backdrop-click cancel.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-description" : undefined}
    >
      <button
        type="button"
        aria-label={cancelLabel}
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <Card className="relative w-full max-w-md p-6 shadow-2xl">
        <h2 id="confirm-dialog-title" className="font-display text-lg font-bold">
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-description" className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "solid" : "accent"}
            size="sm"
            loading={loading}
            onClick={onConfirm}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
