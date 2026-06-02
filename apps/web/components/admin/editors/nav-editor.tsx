"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, TextareaField } from "../fields";

export interface AdminNavItem {
  label: string;
  href: string;
  megaMenu?: unknown;
}

interface Form {
  items: { label: string; href: string; megaMenuJson: string }[];
}

export function NavEditor({ menuKey, items }: { menuKey: string; items: AdminNavItem[] }) {
  const router = useRouter();
  const { register, handleSubmit, control } = useForm<Form>({
    defaultValues: {
      items: items.map((it) => ({
        label: it.label,
        href: it.href,
        megaMenuJson: it.megaMenu ? JSON.stringify(it.megaMenu, null, 2) : "",
      })),
    },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: "items" });
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const payloadItems = f.items.map((it) => {
        let megaMenu: unknown;
        if (it.megaMenuJson.trim()) {
          try {
            megaMenu = JSON.parse(it.megaMenuJson);
          } catch {
            throw new Error(`"${it.label}": mega-menu is not valid JSON`);
          }
        }
        return { label: it.label, href: it.href, megaMenu };
      });
      const res = await fetch(`/api/admin/nav/${menuKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });
      if (!res.ok) throw new Error("Save failed (check links / mega-menu shape)");
      return res.json();
    },
    onSuccess: () => router.refresh(),
  });

  const onSubmit = (f: Form) => {
    setError(null);
    save.mutate(f, { onError: (e) => setError((e as Error).message) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      {fields.map((field, i) => (
        <Card key={field.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col pt-6">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Label" {...register(`items.${i}.label`)} />
                <TextField label="Link" {...register(`items.${i}.href`)} />
              </div>
              <TextareaField
                label="Mega-menu (optional JSON — columns/featured)"
                placeholder='{"columns":[{"heading":"Clothing","links":[{"label":"Dresses","href":"/c/dresses"}]}]}'
                className="font-mono text-xs"
                {...register(`items.${i}.megaMenuJson`)}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove item" className="mt-6" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append({ label: "", href: "", megaMenuJson: "" })}>
        <Plus className="h-4 w-4" /> Add link
      </Button>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="gold" loading={save.isPending}>
          Save navigation
        </Button>
        {save.isSuccess && <span className="text-sm text-gold">Saved</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
