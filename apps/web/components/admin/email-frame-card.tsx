"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Frame, Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { useToast } from "./toast";
import { emailFrameSchema, type EmailFrame } from "@/lib/email-frame";

/**
 * The shared frame around every fragment email (#150): tagline, footer links,
 * address, reply note — edited once, applied to all templates. Full-HTML
 * templates ignore the frame entirely.
 */
export function EmailFrameCard({ initial }: { initial: EmailFrame }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<EmailFrame>({ resolver: zodResolver(emailFrameSchema), defaultValues: initial });
  const links = useFieldArray({ control, name: "links" });

  const onSubmit = async (values: EmailFrame) => {
    try {
      const res = await fetch("/api/admin/email-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Email frame saved — every fragment template uses it.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="flex max-w-3xl flex-col gap-4 p-5">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <Frame className="h-4 w-4 text-muted-foreground" /> Email frame
        </h3>
        <p className="text-sm text-muted-foreground">
          The band, footer links and small print wrapped around every template below. Edited once,
          applied everywhere — full-HTML templates skip the frame.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Tagline (under the logo)" error={errors.tagline?.message} {...register("tagline")} />
          <TextField label="Address line" error={errors.address?.message} {...register("address")} />
        </div>
        <TextField label="Reply note" error={errors.replyNote?.message} {...register("replyNote")} />

        <div className="flex flex-col gap-2">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Footer links (up to 4 — relative paths become site links)
          </span>
          {links.fields.map((f, i) => (
            <div key={f.id} className="flex items-end gap-2">
              <TextField label={i === 0 ? "Label" : undefined} className="w-40" {...register(`links.${i}.label`)} />
              <TextField label={i === 0 ? "Link" : undefined} className="flex-1" placeholder="/offers" {...register(`links.${i}.href`)} />
              <button
                type="button"
                aria-label={`Remove footer link ${i + 1}`}
                onClick={() => links.remove(i)}
                className="cursor-pointer p-2.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {links.fields.length < 4 && (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => links.append({ label: "", href: "" })}>
              <Plus className="h-4 w-4" /> Add link
            </Button>
          )}
        </div>

        <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
          Save frame
        </Button>
      </form>
    </Card>
  );
}
