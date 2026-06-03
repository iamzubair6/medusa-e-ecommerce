"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, TextareaField, SelectField, CheckboxField } from "./fields";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

interface FormColor {
  name: string;
  swatch: string;
  price: string;
  originalPrice: string;
  images: string[];
  sizes: Record<string, string>; // size -> stock (presence = selected)
  uploading: boolean;
}

const emptyColor = (): FormColor => ({
  name: "",
  swatch: "#1b1b1b",
  price: "",
  originalPrice: "",
  images: [],
  sizes: {},
  uploading: false,
});

export function ProductCreator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offerType, setOfferType] = useState<"none" | "bogo" | "discount">("none");
  const [offerLabel, setOfferLabel] = useState("");
  const [offerPercent, setOfferPercent] = useState("");
  const [colors, setColors] = useState<FormColor[]>([emptyColor()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchColor = (i: number, patch: Partial<FormColor>) =>
    setColors((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const toggleSize = (i: number, size: string) =>
    setColors((cs) =>
      cs.map((c, k) => {
        if (k !== i) return c;
        const sizes = { ...c.sizes };
        if (size in sizes) delete sizes[size];
        else sizes[size] = "10";
        return { ...c, sizes };
      }),
    );

  const upload = async (i: number, files: FileList) => {
    patchColor(i, { uploading: true });
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const data = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !data.urls) throw new Error(data.error ?? "Upload failed");
      setColors((cs) =>
        cs.map((c, k) => (k === i ? { ...c, images: [...c.images, ...data.urls!], uploading: false } : c)),
      );
    } catch (e) {
      setError((e as Error).message);
      patchColor(i, { uploading: false });
    }
  };

  const removeImage = (i: number, url: string) =>
    patchColor(i, { images: colors[i]!.images.filter((u) => u !== url) });

  const submit = async () => {
    setError(null);
    // validate
    if (!title.trim()) return setError("Add a product title.");
    for (const [i, c] of colors.entries()) {
      if (!c.name.trim()) return setError(`Color ${i + 1}: add a name.`);
      if (!c.price || Number(c.price) <= 0) return setError(`Color ${c.name || i + 1}: add a price.`);
      if (c.images.length === 0) return setError(`Color ${c.name || i + 1}: add at least one image.`);
      if (Object.keys(c.sizes).length === 0) return setError(`Color ${c.name || i + 1}: pick at least one size.`);
    }
    const payload = {
      title,
      description,
      offer:
        offerType === "none"
          ? undefined
          : {
              type: offerType,
              label: offerLabel || (offerType === "bogo" ? "BUY 1 GET 1 FREE" : "SALE"),
              ...(offerType === "discount" && offerPercent ? { percent: Number(offerPercent) } : {}),
            },
      colors: colors.map((c) => ({
        name: c.name,
        swatch: c.swatch,
        price: Number(c.price),
        originalPrice: c.originalPrice ? Number(c.originalPrice) : undefined,
        images: c.images,
        sizes: Object.entries(c.sizes).map(([size, stock]) => ({ size, stock: Number(stock) || 0 })),
      })),
    };
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { product?: { handle: string }; error?: unknown };
      if (!res.ok || !data.product) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create product");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <TextField label="Product title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ribbed Knit Tank" />
        <TextareaField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Offer" value={offerType} onChange={(e) => setOfferType(e.target.value as typeof offerType)}>
            <option value="none">None</option>
            <option value="discount">Discount</option>
            <option value="bogo">BOGO</option>
          </SelectField>
          {offerType !== "none" && (
            <TextField label="Offer label" value={offerLabel} onChange={(e) => setOfferLabel(e.target.value)} placeholder={offerType === "bogo" ? "BUY 1 GET 1 FREE" : "25% OFF"} />
          )}
          {offerType === "discount" && (
            <TextField label="Percent" type="number" value={offerPercent} onChange={(e) => setOfferPercent(e.target.value)} placeholder="25" />
          )}
        </div>
      </Card>

      {colors.map((c, i) => (
        <Card key={i} className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Color {i + 1}</h3>
            {colors.length > 1 && (
              <button type="button" aria-label="Remove color" onClick={() => setColors((cs) => cs.filter((_, k) => k !== i))} className="cursor-pointer p-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Color name" value={c.name} onChange={(e) => patchColor(i, { name: e.target.value })} placeholder="Olive" />
            <label className="flex flex-col gap-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Swatch</span>
              <input type="color" value={c.swatch} onChange={(e) => patchColor(i, { swatch: e.target.value })} className="h-12 w-20 cursor-pointer rounded-sm border border-input" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Price (৳)" type="number" value={c.price} onChange={(e) => patchColor(i, { price: e.target.value })} placeholder="200" />
            <TextField label="Original price (৳, optional → shows sale)" type="number" value={c.originalPrice} onChange={(e) => patchColor(i, { originalPrice: e.target.value })} placeholder="250" />
          </div>

          {/* sizes */}
          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sizes &amp; stock</span>
            <div className="flex flex-wrap gap-3">
              {SIZES.map((s) => {
                const on = s in c.sizes;
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <CheckboxField label={s} checked={on} onChange={() => toggleSize(i, s)} />
                    {on && (
                      <input
                        type="number"
                        aria-label={`${s} stock`}
                        value={c.sizes[s]}
                        onChange={(e) => patchColor(i, { sizes: { ...c.sizes, [s]: e.target.value } })}
                        className="h-8 w-16 rounded-sm border border-input bg-card px-2 text-sm"
                        placeholder="qty"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Stock ≤ 5 shows a low-stock ⚡ badge.</p>
          </div>

          {/* images */}
          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Images</span>
            <div className="flex flex-wrap gap-2">
              {c.images.map((url) => (
                <div key={url} className="relative h-20 w-16 overflow-hidden rounded-sm border border-border">
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                  <button type="button" aria-label="Remove image" onClick={() => removeImage(i, url)} className="absolute right-0.5 top-0.5 cursor-pointer rounded-full bg-background/80 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className={cn("flex h-20 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-[0.6rem] text-muted-foreground hover:border-foreground", c.uploading && "opacity-50")}>
                <Upload className="h-4 w-4" />
                {c.uploading ? "..." : "Upload"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={c.uploading} onChange={(e) => e.target.files && upload(i, e.target.files)} />
              </label>
            </div>
          </div>
        </Card>
      ))}

      <Button type="button" variant="outline" className="w-fit" onClick={() => setColors((cs) => [...cs, emptyColor()])}>
        <Plus className="h-4 w-4" /> Add another color
      </Button>

      <div className="flex items-center gap-3">
        <Button type="button" variant="gold" loading={saving} onClick={submit}>
          Create product
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
