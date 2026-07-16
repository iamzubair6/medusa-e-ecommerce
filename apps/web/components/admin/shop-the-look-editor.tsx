"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { Combobox } from "./combobox";
import { TextField } from "./fields";
import { useToast } from "./toast";
import { shopTheLookSchema, type ShopTheLook } from "@/lib/shop-the-look";

export interface LookProductOption {
  handle: string;
  title: string;
  image: string;
}

/**
 * Admin editor for Shop-the-Look outfit tags. Pick a product, click the photo
 * to drop a hotspot, link each hotspot to a product. Saves the "shopTheLook"
 * SiteSetting via /api/admin/shop-the-look (RHF + Zod holds the value).
 */
export function ShopTheLookEditor({ initial, products }: { initial: ShopTheLook; products: LookProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [active, setActive] = useState<number | null>(initial.looks.length > 0 ? 0 : null);
  const [confirmingRemove, setConfirmingRemove] = useState<number | null>(null);

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ShopTheLook>({ resolver: zodResolver(shopTheLookSchema), defaultValues: initial });
  const looks = watch("looks");

  const options = useMemo(() => products.map((p) => ({ value: p.handle, label: p.title })), [products]);
  const byHandle = useMemo(() => new Map(products.map((p) => [p.handle, p])), [products]);

  const addLook = (handle: string) => {
    if (!handle || looks.some((l) => l.productHandle === handle)) return;
    const product = byHandle.get(handle);
    if (!product?.image) return toast.error("That product has no image to tag.");
    setValue("looks", [...looks, { productHandle: handle, imageUrl: product.image, hotspots: [] }], {
      shouldDirty: true,
    });
    setActive(looks.length);
  };

  const removeLook = (i: number) => {
    setValue("looks", looks.filter((_, idx) => idx !== i), { shouldDirty: true });
    setActive(null);
    setConfirmingRemove(null);
  };

  const placeHotspot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (active === null) return;
    const look = looks[active];
    if (!look || look.hotspots.length >= 8) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    const next = looks.map((l, idx) =>
      idx === active ? { ...l, hotspots: [...l.hotspots, { x, y, productHandle: "", label: "" }] } : l,
    );
    setValue("looks", next, { shouldDirty: true });
  };

  const setHotspot = (li: number, hi: number, patch: Partial<ShopTheLook["looks"][number]["hotspots"][number]>) => {
    const next = looks.map((l, idx) =>
      idx === li ? { ...l, hotspots: l.hotspots.map((h, hidx) => (hidx === hi ? { ...h, ...patch } : h)) } : l,
    );
    setValue("looks", next, { shouldDirty: true });
  };

  const removeHotspot = (li: number, hi: number) => {
    const next = looks.map((l, idx) =>
      idx === li ? { ...l, hotspots: l.hotspots.filter((_, hidx) => hidx !== hi) } : l,
    );
    setValue("looks", next, { shouldDirty: true });
  };

  const onSubmit = async (values: ShopTheLook) => {
    const incomplete = values.looks.find((l) => l.hotspots.some((h) => !h.productHandle));
    if (incomplete) return toast.error(`"${incomplete.productHandle}" has a tag without a linked product.`);
    try {
      const res = await fetch("/api/admin/shop-the-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Shop the Look saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const current = active !== null ? looks[active] : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-5xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Looks</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Combobox label="Add a look for product…" value="" onChange={addLook} options={options} placeholder="Search products" />
          </div>
          {looks.map((l, i) => (
            <button
              key={l.productHandle}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-sm border px-3 py-2 text-sm ${active === i ? "border-foreground font-semibold" : "border-border text-muted-foreground"}`}
            >
              {byHandle.get(l.productHandle)?.title ?? l.productHandle} ({l.hotspots.length})
            </button>
          ))}
        </div>
        {looks.length === 0 && <p className="text-sm text-muted-foreground">No looks yet — pick a product above to start tagging.</p>}
      </Card>

      {current && active !== null && (
        <Card className="grid gap-6 p-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Click the photo to drop a tag (max 8).</p>
            <div className="relative inline-block cursor-crosshair" onClick={placeHotspot}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.imageUrl} alt="Look photo" className="max-h-[560px] w-auto select-none" draggable={false} />
              {current.hotspots.map((h, hi) => (
                <span
                  key={hi}
                  className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-ink/80 text-[11px] font-bold text-white"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  {hi + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold">Tags</h4>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingRemove(active)}>
                <Trash2 className="mr-1 h-4 w-4" /> Remove look
              </Button>
            </div>
            {current.hotspots.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
            {current.hotspots.map((h, hi) => (
              <div key={hi} className="flex flex-col gap-2 rounded-sm border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tag {hi + 1} — {h.x}% / {h.y}%</span>
                  <button type="button" aria-label={`Remove tag ${hi + 1}`} onClick={() => removeHotspot(active, hi)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Combobox
                  label="Linked product"
                  required
                  value={h.productHandle}
                  onChange={(v) => setHotspot(active, hi, { productHandle: v, label: byHandle.get(v)?.title ?? "" })}
                  options={options}
                  placeholder="Which piece is this?"
                />
                <TextField
                  label="Label (shown on hover)"
                  value={h.label}
                  onChange={(e) => setHotspot(active, hi, { label: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
          Save Shop the Look
        </Button>
        <p className="text-xs text-muted-foreground">
          <Plus className="mr-1 inline h-3 w-3" />
          Dots appear on that product's page under "Shop the Look".
        </p>
      </div>

      <ConfirmDialog
        open={confirmingRemove !== null}
        title="Remove this look and all its tags?"
        description="It disappears from the editor now and is gone for good once you save."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (confirmingRemove !== null) removeLook(confirmingRemove);
        }}
        onCancel={() => setConfirmingRemove(null)}
      />
    </form>
  );
}
