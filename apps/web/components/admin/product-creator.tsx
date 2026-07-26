"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { RichTextField } from "./rich-text-field";
import { Combobox, EnumCombobox } from "./combobox";
import { useToast } from "./toast";

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

/** Plain (server-serialisable) shape used to pre-fill the form in edit mode. */
export interface ProductInitial {
  id: string;
  title: string;
  description?: string;
  offer?: { type: "bogo" | "discount" | "custom"; label: string; percent?: number };
  categoryIds?: string[];
  tags?: string[];
  type?: string;
  division?: string;
  occasion?: string[];
  style?: string[];
  trend?: string[];
  sleeve?: string[];
  neckline?: string[];
  length?: string[];
  fabric?: string[];
  print?: string[];
  material?: string;
  care?: string;
  sizeGuide?: string;
  freeDelivery?: boolean;
  colors: {
    name: string;
    swatch: string;
    price: number;
    originalPrice?: number;
    images: string[];
    sizes: { size: string; stock: number }[];
  }[];
}

const DIVISION_OPTIONS = [
  { value: "", label: "— none —" },
  { value: "women", label: "Women" },
  { value: "plus", label: "Plus+Curve" },
  { value: "men", label: "Men" },
  { value: "sport", label: "Sport" },
  { value: "kids", label: "Kids" },
  { value: "beauty", label: "Beauty" },
];

export interface CategoryOption {
  id: string;
  name: string;
}

const toFormColor = (c: ProductInitial["colors"][number]): FormColor => ({
  name: c.name,
  swatch: c.swatch,
  price: String(c.price),
  originalPrice: c.originalPrice ? String(c.originalPrice) : "",
  images: c.images,
  sizes: Object.fromEntries(c.sizes.map((s) => [s.size, String(s.stock)])),
  uploading: false,
});

export function ProductCreator({
  initial,
  categories = [],
}: {
  initial?: ProductInitial;
  categories?: CategoryOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [offerType, setOfferType] = useState<"none" | "bogo" | "discount" | "custom">(initial?.offer?.type ?? "none");
  const [offerLabel, setOfferLabel] = useState(initial?.offer?.label ?? "");
  const [offerPercent, setOfferPercent] = useState(initial?.offer?.percent ? String(initial.offer.percent) : "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [division, setDivision] = useState(initial?.division ?? "");
  const [occasion, setOccasion] = useState(initial?.occasion?.join(", ") ?? "");
  const [styleTags, setStyleTags] = useState(initial?.style?.join(", ") ?? "");
  const [trend, setTrend] = useState(initial?.trend?.join(", ") ?? "");
  const [sleeve, setSleeve] = useState(initial?.sleeve?.join(", ") ?? "");
  const [neckline, setNeckline] = useState(initial?.neckline?.join(", ") ?? "");
  const [length, setLength] = useState(initial?.length?.join(", ") ?? "");
  const [fabric, setFabric] = useState(initial?.fabric?.join(", ") ?? "");
  const [print, setPrint] = useState(initial?.print?.join(", ") ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [freeDelivery, setFreeDelivery] = useState(initial?.freeDelivery ?? false);
  const [care, setCare] = useState(initial?.care ?? "");
  const [sizeGuide, setSizeGuide] = useState(initial?.sizeGuide ?? "");
  const [colors, setColors] = useState<FormColor[]>(
    initial ? initial.colors.map(toFormColor) : [emptyColor()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

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
    // Auto-derive the discount % from the deepest colour markdown if not typed in.
    const autoPercent = (() => {
      const pcts = colors
        .map((c) => {
          const o = Number(c.originalPrice);
          const p = Number(c.price);
          return o > 0 && p > 0 && o > p ? Math.round(((o - p) / o) * 100) : 0;
        })
        .filter(Boolean);
      return pcts.length ? Math.max(...pcts) : undefined;
    })();
    const discountPercent = offerPercent ? Number(offerPercent) : autoPercent;

    const payload = {
      title,
      description,
      categoryIds,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      type: type.trim() || undefined,
      division: division || undefined,
      occasion: occasion.split(",").map((t) => t.trim()).filter(Boolean),
      style: styleTags.split(",").map((t) => t.trim()).filter(Boolean),
      trend: trend.split(",").map((t) => t.trim()).filter(Boolean),
      sleeve: sleeve.split(",").map((t) => t.trim()).filter(Boolean),
      neckline: neckline.split(",").map((t) => t.trim()).filter(Boolean),
      length: length.split(",").map((t) => t.trim()).filter(Boolean),
      fabric: fabric.split(",").map((t) => t.trim()).filter(Boolean),
      print: print.split(",").map((t) => t.trim()).filter(Boolean),
      material: material.trim() || undefined,
      care: care.trim() || undefined,
      sizeGuide: sizeGuide.trim() || undefined,
      freeDelivery: freeDelivery || undefined,
      offer:
        offerType === "none"
          ? undefined
          : {
              type: offerType,
              label:
                offerLabel ||
                (offerType === "bogo"
                  ? "BUY 1 GET 1 FREE"
                  : offerType === "custom"
                    ? "NEW"
                    : discountPercent
                      ? `${discountPercent}% OFF`
                      : "SALE"),
              ...(offerType === "discount" && discountPercent ? { percent: discountPercent } : {}),
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
      const res = await fetch(
        editing ? `/api/admin/products/${initial!.id}` : "/api/admin/products",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { product?: { handle: string }; ok?: boolean; error?: unknown };
      if (!res.ok || (!editing && !data.product)) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not save product");
      }
      toast.success(editing ? "Product updated." : "Product created.");
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <TextField label="Product title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ribbed Knit Tank" />
        <RichTextField label="Description" value={description} onChange={setDescription} />
        <div className="grid gap-4 sm:grid-cols-3">
          <EnumCombobox
            label="Offer"
            value={offerType}
            onChange={setOfferType}
            options={[
              { value: "none", label: "None" },
              { value: "discount", label: "Discount" },
              { value: "bogo", label: "BOGO" },
              { value: "custom", label: "Custom badge" },
            ]}
          />
          {offerType !== "none" && (
            <TextField label="Offer label" value={offerLabel} onChange={(e) => setOfferLabel(e.target.value)} placeholder={offerType === "bogo" ? "BUY 1 GET 1 FREE" : offerType === "custom" ? "NEW · LIMITED · 2 FOR 1" : "25% OFF"} />
          )}
          {offerType === "discount" && (
            <TextField label="Percent" type="number" value={offerPercent} onChange={(e) => setOfferPercent(e.target.value)} placeholder="25" />
          )}
        </div>
        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Categories</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const on = categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on ? "border-foreground bg-foreground text-background" : "border-border text-foreground/70 hover:border-foreground",
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Controls which category page(s) the product appears on.</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Type (optional)" value={type} onChange={(e) => setType(e.target.value)} placeholder="Clothing" />
          <TextField label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="summer, bestseller" />
        </div>

        {/* Merchandising attributes (drive storefront filters + PDP) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Combobox label="Division" value={division} onChange={setDivision} options={DIVISION_OPTIONS} placeholder="— none —" />
          <TextField label="Occasion (comma-separated)" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Going Out, Everyday" />
          <TextField label="Style (comma-separated)" value={styleTags} onChange={(e) => setStyleTags(e.target.value)} placeholder="Bodycon, Sexy" />
          <TextField label="Trend (comma-separated)" value={trend} onChange={(e) => setTrend(e.target.value)} placeholder="Summer, Floral" />
          <TextField label="Sleeve (comma-separated)" value={sleeve} onChange={(e) => setSleeve(e.target.value)} placeholder="Long Sleeve, Short Sleeve" />
          <TextField label="Neckline (comma-separated)" value={neckline} onChange={(e) => setNeckline(e.target.value)} placeholder="Crew, V-Neck" />
          <TextField label="Length (comma-separated)" value={length} onChange={(e) => setLength(e.target.value)} placeholder="Mini, Midi, Maxi" />
          <TextField label="Fabric (comma-separated)" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Cotton, Linen, Satin" />
          <TextField label="Print (comma-separated)" value={print} onChange={(e) => setPrint(e.target.value)} placeholder="Floral, Solid, Striped" />
        </div>
        <CheckboxField
          label="Free delivery — badge on card/PDP; shipping is free when every cart item has this"
          checked={freeDelivery}
          onChange={(e) => setFreeDelivery(e.target.checked)}
        />
        <RichTextField label="Material / composition" value={material} onChange={setMaterial} />
        <RichTextField label="Care" value={care} onChange={setCare} />
        <RichTextField
          label="Size guide (optional — overrides the global size guide for this product)"
          value={sizeGuide}
          onChange={setSizeGuide}
        />
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
          {(() => {
            const price = Number(c.price);
            const orig = Number(c.originalPrice);
            if (orig > 0 && price > 0 && orig > price) {
              const pct = Math.round(((orig - price) / orig) * 100);
              return (
                <p className="-mt-1 text-xs font-medium text-accent">
                  −{pct}% off · saves ৳{(orig - price).toLocaleString("en-US")} (auto-calculated)
                </p>
              );
            }
            return null;
          })()}

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
          {editing ? "Save changes" : "Create product"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
