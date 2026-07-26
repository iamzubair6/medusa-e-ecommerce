"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { MediaUploadField } from "./media-upload-field";
import { useToast } from "./toast";
import type { SiteSettings, Landing } from "@/lib/site-settings";

interface Tile { label: string; image: string; href: string }
type CollabSlide = SiteSettings["landing"]["collabSlides"][number];

/** Pages whose curated landing can be edited ("home" = Women/global). */
const LANDING_PAGES = [
  { key: "home", label: "Home (Women)" },
  { key: "men", label: "Men" },
  { key: "plus", label: "Curve" },
  { key: "sport", label: "Sport" },
  { key: "kids", label: "Kids" },
  { key: "beauty", label: "Beauty" },
] as const;

/** Reusable add/remove editor for a list of {label, image, href} tiles. */
function TileArray({ label, items, onChange }: { label: string; items: Tile[]; onChange: (items: Tile[]) => void }) {
  const set = (i: number, k: keyof Tile, v: string) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { label: "", image: "", href: "" }])}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField label="Label" value={it.label} onChange={(e) => set(i, "label", e.target.value)} />
            <TextField label="Link" value={it.href} onChange={(e) => set(i, "href", e.target.value)} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <MediaUploadField label="Image" value={it.image} onChange={(url) => set(i, "image", url)} hint="Upload or paste a URL" />
        </div>
      ))}
    </div>
  );
}

/** Add/remove editor for the brand collab carousel slides (image/title/href + optional eyebrow/cta). */
function CollabSlideArray({ label, items, onChange }: { label: string; items: CollabSlide[]; onChange: (items: CollabSlide[]) => void }) {
  const set = (i: number, k: keyof CollabSlide, v: string) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { image: "", title: "", href: "" }])}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">Slide {i + 1}</span>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <MediaUploadField label="Image" value={it.image} onChange={(url) => set(i, "image", url)} hint="Upload or paste a URL" />
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Eyebrow (optional)" value={it.eyebrow ?? ""} onChange={(e) => set(i, "eyebrow", e.target.value)} />
            <TextField label="Title" value={it.title} onChange={(e) => set(i, "title", e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Link" value={it.href} onChange={(e) => set(i, "href", e.target.value)} />
            <TextField label="Button label (optional)" value={it.cta ?? ""} onChange={(e) => set(i, "cta", e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SiteSettingsEditor({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [annActive, setAnnActive] = useState(initial.announcement.active);
  const [annMsg, setAnnMsg] = useState(initial.announcement.message);
  const [annHref, setAnnHref] = useState(initial.announcement.href);
  const [mqEnabled, setMqEnabled] = useState(initial.marquee.enabled);
  const [mqItems, setMqItems] = useState(initial.marquee.items.join(", "));
  const [brands, setBrands] = useState(initial.brands);
  const [accents, setAccents] = useState(initial.accentByDivision);
  // Delivery line + Shipping & Returns moved to /admin/shipping, size guide to
  // /admin/size-guides; the stored values are preserved but no longer edited here.
  const [deliveryLine] = useState(initial.deliveryLine);
  const [sizeGuide] = useState(initial.sizeGuide);
  const [shippingReturns] = useState(initial.shippingReturns);
  const [tileCount, setTileCount] = useState(String(initial.categoryTileCount));
  const [saving, setSaving] = useState(false);

  // Curated landing content, per page: "home" is the global default; each
  // division key is an override that only exists once edited (else it inherits
  // home). This is what lets /pages/men show its own hero/promo/feature.
  const [landings, setLandings] = useState<Record<string, Landing>>(() => ({
    home: initial.landing,
    ...initial.landingByDivision,
  }));
  const [editingPage, setEditingPage] = useState("home");
  const landing = landings[editingPage] ?? landings.home!;
  const isOverride = editingPage !== "home" && landings[editingPage] !== undefined;
  const setLanding = (updater: (l: Landing) => Landing) =>
    setLandings((ls) => ({ ...ls, [editingPage]: updater(ls[editingPage] ?? ls.home!) }));
  const resetPage = () =>
    setLandings((ls) => {
      const next = { ...ls };
      delete next[editingPage];
      return next;
    });

  type LandingObjBlock = "hero" | "promo" | "feature" | "sale";
  const setL = <B extends LandingObjBlock>(block: B, key: keyof Landing[B], value: string) =>
    setLanding((l) => ({ ...l, [block]: { ...l[block], [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const cleanLanding = (l: Landing): Landing => ({
        ...l,
        collabSlides: l.collabSlides.map((s) => ({
          image: s.image.trim(),
          title: s.title.trim(),
          href: s.href.trim(),
          eyebrow: s.eyebrow?.trim() || undefined,
          cta: s.cta?.trim() || undefined,
        })),
      });
      const landingByDivision: Record<string, Landing> = {};
      for (const [key, value] of Object.entries(landings)) {
        if (key !== "home") landingByDivision[key] = cleanLanding(value);
      }
      const body: SiteSettings = {
        announcement: { active: annActive, message: annMsg.trim(), href: annHref.trim() || "/products" },
        marquee: { enabled: mqEnabled, items: mqItems.split(",").map((s) => s.trim()).filter(Boolean) },
        brands,
        accentByDivision: accents,
        deliveryLine: deliveryLine.trim(),
        sizeGuide,
        shippingReturns,
        categoryTileCount: Math.min(9, Math.max(3, Number(tileCount) || 7)),
        landing: cleanLanding(landings.home!),
        landingByDivision,
      };
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Storefront content saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setBrand = (k: keyof SiteSettings["brands"], v: string) => setBrands((b) => ({ ...b, [k]: v }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Announcement bar</h3>
        <CheckboxField label="Show the announcement bar" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} />
        <TextField label="Message" value={annMsg} onChange={(e) => setAnnMsg(e.target.value)} placeholder="FREE SHIPPING ON ORDERS OVER ৳2,000" />
        <TextField label="Shop Now link" value={annHref} onChange={(e) => setAnnHref(e.target.value)} placeholder="/products" />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Marquee strip</h3>
        <CheckboxField label="Show the scrolling marquee" checked={mqEnabled} onChange={(e) => setMqEnabled(e.target.checked)} />
        <TextField label="Items (comma-separated)" value={mqItems} onChange={(e) => setMqItems(e.target.value)} placeholder="Free Shipping, Cash on Delivery, Easy Returns" />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Brand name per division</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(brands) as (keyof SiteSettings["brands"])[]).map((k) => (
            <TextField key={k} label={k} value={brands[k]} onChange={(e) => setBrand(k, e.target.value)} />
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Accent color per division</h3>
        <p className="text-sm text-muted-foreground">
          Optional — give a department its own accent (buttons, highlights). Leave empty to use the
          brand claret. Applies to that division&rsquo;s home/landing pages.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(accents) as (keyof SiteSettings["accentByDivision"])[]).map((k) => (
            <label key={k} className="flex flex-col gap-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{k}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${k} accent color`}
                  value={/^#[0-9a-f]{6}$/i.test(accents[k]) ? accents[k] : "#7a2230"}
                  onChange={(e) => setAccents((a) => ({ ...a, [k]: e.target.value }))}
                  className="h-10 w-12 cursor-pointer rounded-sm border border-border bg-card"
                />
                <input
                  type="text"
                  value={accents[k]}
                  onChange={(e) => setAccents((a) => ({ ...a, [k]: e.target.value }))}
                  placeholder="default"
                  className="h-10 w-full rounded-sm border border-input bg-card/60 px-3 text-sm"
                />
                {accents[k] && (
                  <button
                    type="button"
                    onClick={() => setAccents((a) => ({ ...a, [k]: "" }))}
                    className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Homepage</h3>
        <TextField label="Shop-by-category tiles on the homepage (3–9)" type="number" value={tileCount} onChange={(e) => setTileCount(e.target.value)} />
        <p className="text-sm text-muted-foreground">
          Product-page content lives with its own settings: the <strong>delivery line</strong> and{" "}
          <strong>Shipping &amp; Returns</strong> text are edited in <strong>Shipping</strong>{" "}
          (sidebar), size charts in <strong>Size guides</strong>.
        </p>
      </Card>

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-lg font-bold">Landing blocks</h3>
          <p className="text-sm text-muted-foreground">
            Edit the curated (Fashion-Nova) landing per page. Each department can have its own
            hero, promo and feature — pick a page below. A page shows the <strong>Home</strong>{" "}
            content until you customize it here. (Only applies where a page&rsquo;s Landing style is
            &ldquo;Fashion-Nova&rdquo; — see Landing style.)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {LANDING_PAGES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setEditingPage(p.key)}
                className={
                  editingPage === p.key
                    ? "rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background"
                    : "rounded-full border border-border px-3.5 py-1.5 text-xs hover:border-foreground"
                }
              >
                {p.label}
                {p.key !== "home" && landings[p.key] ? " ●" : ""}
              </button>
            ))}
            {isOverride && (
              <button
                type="button"
                onClick={resetPage}
                className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Reset to Home content
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {editingPage === "home"
              ? "Editing: Home (Women)."
              : isOverride
                ? `Editing: ${LANDING_PAGES.find((p) => p.key === editingPage)?.label} — customized.`
                : `Editing: ${LANDING_PAGES.find((p) => p.key === editingPage)?.label} — currently inherits Home. Any change makes it a custom page.`}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hero offer</span>
          <MediaUploadField label="Image" value={landing.hero.image} onChange={(url) => setL("hero", "image", url)} hint="Upload or paste a URL" />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Eyebrow" value={landing.hero.eyebrow} onChange={(e) => setL("hero", "eyebrow", e.target.value)} />
            <TextField label="Headline" value={landing.hero.headline} onChange={(e) => setL("hero", "headline", e.target.value)} />
          </div>
          <TextField label="Subtext" value={landing.hero.subtext} onChange={(e) => setL("hero", "subtext", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Button label" value={landing.hero.ctaLabel} onChange={(e) => setL("hero", "ctaLabel", e.target.value)} />
            <TextField label="Button link" value={landing.hero.ctaHref} onChange={(e) => setL("hero", "ctaHref", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Promo banner</span>
          <MediaUploadField label="Image" value={landing.promo.image} onChange={(url) => setL("promo", "image", url)} hint="Upload or paste a URL" />
          <TextField label="Heading" value={landing.promo.heading} onChange={(e) => setL("promo", "heading", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Button label" value={landing.promo.ctaLabel} onChange={(e) => setL("promo", "ctaLabel", e.target.value)} />
            <TextField label="Button link" value={landing.promo.ctaHref} onChange={(e) => setL("promo", "ctaHref", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature banner</span>
          <MediaUploadField label="Image" value={landing.feature.image} onChange={(url) => setL("feature", "image", url)} hint="Upload or paste a URL" />
          <TextField label="Heading" value={landing.feature.heading} onChange={(e) => setL("feature", "heading", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Button label" value={landing.feature.ctaLabel} onChange={(e) => setL("feature", "ctaLabel", e.target.value)} />
            <TextField label="Button link" value={landing.feature.ctaHref} onChange={(e) => setL("feature", "ctaHref", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sale strip</span>
          <TextField label="Heading" value={landing.sale.heading} onChange={(e) => setL("sale", "heading", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Button label" value={landing.sale.ctaLabel} onChange={(e) => setL("sale", "ctaLabel", e.target.value)} />
            <TextField label="Button link" value={landing.sale.ctaHref} onChange={(e) => setL("sale", "ctaHref", e.target.value)} />
          </div>
        </div>

        <CollabSlideArray label="Brand collab carousel" items={landing.collabSlides} onChange={(items) => setLanding((l) => ({ ...l, collabSlides: items }))} />
        <TileArray label="Trend report cards" items={landing.trendCards} onChange={(items) => setLanding((l) => ({ ...l, trendCards: items }))} />
        <TileArray label="Shop by brand tiles" items={landing.brandTiles} onChange={(items) => setLanding((l) => ({ ...l, brandTiles: items }))} />
      </Card>

      <Button variant="gold" loading={saving} onClick={save} className="w-fit">Save storefront content</Button>
    </div>
  );
}
