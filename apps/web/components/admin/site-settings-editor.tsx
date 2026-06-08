"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@ecom/ui";
import { TextField, TextareaField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import type { SiteSettings } from "@/lib/site-settings";

export function SiteSettingsEditor({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [annActive, setAnnActive] = useState(initial.announcement.active);
  const [annMsg, setAnnMsg] = useState(initial.announcement.message);
  const [annHref, setAnnHref] = useState(initial.announcement.href);
  const [mqEnabled, setMqEnabled] = useState(initial.marquee.enabled);
  const [mqItems, setMqItems] = useState(initial.marquee.items.join(", "));
  const [brands, setBrands] = useState(initial.brands);
  const [deliveryLine, setDeliveryLine] = useState(initial.deliveryLine);
  const [sizeGuide, setSizeGuide] = useState(initial.sizeGuide);
  const [shippingReturns, setShippingReturns] = useState(initial.shippingReturns);
  const [tileCount, setTileCount] = useState(String(initial.categoryTileCount));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body: SiteSettings = {
        announcement: { active: annActive, message: annMsg.trim(), href: annHref.trim() || "/products" },
        marquee: { enabled: mqEnabled, items: mqItems.split(",").map((s) => s.trim()).filter(Boolean) },
        brands,
        deliveryLine: deliveryLine.trim(),
        sizeGuide,
        shippingReturns,
        categoryTileCount: Math.min(9, Math.max(3, Number(tileCount) || 7)),
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
        <h3 className="font-display text-lg font-bold">Product page</h3>
        <TextField label="Delivery line (PDP)" value={deliveryLine} onChange={(e) => setDeliveryLine(e.target.value)} />
        <TextareaField label="Size guide (HTML or text — shown in the PDP modal)" value={sizeGuide} onChange={(e) => setSizeGuide(e.target.value)} placeholder="<table>…</table> or a few lines of guidance" />
        <TextareaField label="Shipping & Returns (HTML or text — PDP accordion)" value={shippingReturns} onChange={(e) => setShippingReturns(e.target.value)} placeholder="Standard delivery in 3–5 days. Cash on Delivery available. Free returns within 30 days." />
        <TextField label="Shop-by-category tiles on the homepage (3–9)" type="number" value={tileCount} onChange={(e) => setTileCount(e.target.value)} />
      </Card>

      <Button variant="gold" loading={saving} onClick={save} className="w-fit">Save storefront content</Button>
    </div>
  );
}
