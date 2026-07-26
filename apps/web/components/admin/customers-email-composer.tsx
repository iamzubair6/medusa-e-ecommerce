"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { EnumCombobox } from "./combobox";
import { useToast } from "./toast";

interface TemplateOption {
  id: string;
  name: string;
  subject: string;
}

/**
 * Bulk email composer: pick a custom template (built in /admin/email-templates)
 * and send it to every customer with a real email. Typed SEND-count
 * confirmation; audience resolved server-side.
 */
export function CustomersEmailComposer({ templates }: { templates: TemplateOption[] }) {
  const toast = useToast();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [confirmText, setConfirmText] = useState("");

  const audience = useQuery({
    queryKey: ["bulk-email-audience"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers/email");
      const d = (await res.json()) as { recipients?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not load the audience");
      return d.recipients ?? 0;
    },
    staleTime: 60_000,
  });

  const send = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/customers/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, expectedRecipients: audience.data ?? 0 }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Send failed");
      return d.sent ?? 0;
    },
    onSuccess: (sent) => {
      toast.success(`Campaign sent to ${sent} inbox${sent === 1 ? "" : "es"}.`);
      setConfirmText("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const selected = templates.find((t) => t.id === templateId);
  const count = audience.data ?? 0;
  const confirmed = confirmText.trim() === `SEND ${count}`;

  return (
    <Card className="mb-6 flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-lg font-bold">Email campaign</h3>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom templates yet — create one in{" "}
          <Link href="/admin/email-templates" className="underline underline-offset-2 hover:text-foreground">
            Email templates
          </Link>{" "}
          first, then send it from here.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumCombobox
              label="Template"
              value={templateId}
              onChange={setTemplateId}
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
            />
            <div className="flex flex-col justify-end pb-1 text-sm text-muted-foreground">
              {audience.isPending && "Counting the audience…"}
              {audience.isError && <span className="text-destructive">{(audience.error as Error).message}</span>}
              {audience.isSuccess && (
                <span>
                  Audience: <strong className="text-foreground">{count}</strong> customer{count === 1 ? "" : "s"} with an
                  email · subject &ldquo;{selected?.subject}&rdquo;
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              label={`Type SEND ${count} to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`SEND ${count}`}
              className="w-64"
            />
            <Button
              variant="gold"
              loading={send.isPending}
              disabled={!confirmed || count === 0 || !templateId}
              onClick={() => send.mutate()}
            >
              Send campaign
            </Button>
            <p className="pb-1 text-xs text-muted-foreground">
              Brevo free tier: 300 emails/day — campaigns above 300 recipients are blocked.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
