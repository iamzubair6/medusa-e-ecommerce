"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Star,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { Button, cn } from "@ecom/ui";
import type { StoreProductDetail } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import type { SizeGuide } from "@/lib/size-guides";
import { SizeGuideModal } from "./size-guide-modal";
import { SimilarStylesCard } from "./similar-styles-card";

export function PdpClient({
  product,
  reviewSummary,
  deliveryLine,
  sizeGuide: structuredGuide,
  sizeGuideContent,
  shippingReturns,
  similarStyles = [],
  styleWith = [],
}: {
  product: StoreProductDetail;
  reviewSummary?: { count: number; average: number };
  deliveryLine?: string;
  sizeGuide?: SizeGuide;
  sizeGuideContent?: string;
  shippingReturns?: string;
  similarStyles?: { handle: string; title: string; thumbnail: string }[];
  styleWith?: { handle: string; title: string; thumbnail: string }[];
}) {
  const [colorIdx, setColorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [sizeGuide, setSizeGuide] = useState(false);
  const [shared, setShared] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: product.title, text: product.title, url });
        return;
      } catch {
        return; // user dismissed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const { has: wishHas, toggle: toggleWishlist } = useWishlist();
  const wished = wishHas(product.handle);

  const color = product.colors[colorIdx] ?? product.colors[0]!;
  const images = color.images.length ? color.images : product.images;
  const sizeObj = useMemo(() => color.sizes.find((s) => s.size === size), [color, size]);
  const ready = !!sizeObj?.variantId;

  const chooseColor = (i: number) => {
    setColorIdx(i);
    setImageIdx(0);
    setSize(null);
    setAdded(false);
  };

  const addToBag = () => {
    if (!sizeObj?.variantId) return;
    addItem.mutate(
      { variantId: sizeObj.variantId, quantity: 1 },
      { onSuccess: () => { setAdded(true); openCart(); } },
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Gallery */}
      <div className="flex gap-3">
        <div className="hidden w-16 shrink-0 flex-col gap-2 sm:flex">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Image ${i + 1}`}
              onMouseEnter={() => setImageIdx(i)}
              onClick={() => setImageIdx(i)}
              className={cn(
                "relative aspect-[3/4] w-full overflow-hidden border transition",
                i === imageIdx ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          {product.offer && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-accent-foreground">
              {product.offer.type === "bogo" ? "BOGO" : product.offer.label}
            </span>
          )}
          <ZoomImage src={images[imageIdx] ?? product.thumbnail} alt={product.title} onOpen={() => setLightbox(true)} />
        </div>
      </div>

      {/* Buy box */}
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-bold tracking-tight">{product.title}</h1>
            <button type="button" onClick={share} className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {shared ? <Check className="h-4 w-4 text-accent" /> : <Share2 className="h-4 w-4" />} {shared ? "Link copied" : "Share"}
            </button>
          </div>
          <a href="#reviews" className="mt-1.5 flex items-center gap-1.5">
            <span className="flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    i < Math.round(reviewSummary?.average ?? 0) ? "fill-foreground text-foreground" : "text-muted-foreground/40",
                  )}
                />
              ))}
            </span>
            <span className="text-xs text-muted-foreground underline">
              {reviewSummary && reviewSummary.count > 0 ? `${reviewSummary.average} (${reviewSummary.count})` : "Write a review"}
            </span>
          </a>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">{color.price}</span>
            {color.originalPrice && (
              <span className="text-base text-muted-foreground line-through">{color.originalPrice}</span>
            )}
          </div>
          {product.offer && (
            <p className="mt-1 text-sm font-semibold text-accent">
              {product.offer.label}
              {product.offer.type === "bogo" && " — Use code FREE"}
            </p>
          )}
        </div>

        {/* Color */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Color — <span className="text-foreground">{color.name}</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={i === colorIdx}
                title={c.name}
                onClick={() => chooseColor(i)}
                className={cn(
                  "h-9 w-9 cursor-pointer rounded-full border p-0.5 transition",
                  i === colorIdx ? "border-foreground" : "border-border hover:border-foreground/50",
                )}
              >
                <span className="block h-full w-full rounded-full" style={{ backgroundColor: c.swatch }} />
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Size</span>
            <button type="button" onClick={() => setSizeGuide(true)} className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground">
              View Size Guide
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {color.sizes.map((s) => {
              const isActive = size === s.size;
              const soldOut = s.stock <= 0;
              return (
                <button
                  key={s.size}
                  type="button"
                  disabled={soldOut}
                  onClick={() => { setSize(s.size); setAdded(false); }}
                  aria-pressed={isActive}
                  className={cn(
                    "relative flex min-w-14 cursor-pointer items-center justify-center gap-1 rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                    soldOut && "cursor-not-allowed opacity-40 line-through",
                  )}
                >
                  {s.size}
                  {s.lowStock && !soldOut && <Zap className="h-3 w-3 text-accent" aria-label="Low stock" />}
                </button>
              );
            })}
          </div>
          {sizeObj?.lowStock && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Zap className="h-3.5 w-3.5" /> Hurry — only {sizeObj.stock} left in {color.name} / {sizeObj.size}!
            </p>
          )}
        </div>

        {/* Add to bag + wishlist */}
        <div className="flex items-center gap-3">
          <Button
            variant="solid"
            size="lg"
            disabled={!ready}
            loading={addItem.isPending}
            onClick={addToBag}
            className="h-14 flex-1 rounded-full text-sm"
          >
            {added && !addItem.isPending ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            {added && !addItem.isPending ? "Added to Bag" : ready ? "Add to Bag" : size ? "Unavailable" : "Select a Size"}
          </Button>
          <button
            type="button"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            onClick={() => toggleWishlist({ handle: product.handle, title: product.title, thumbnail: product.thumbnail, price: color.price })}
            className={cn(
              "flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors hover:border-foreground",
              wished ? "border-accent text-accent" : "border-border hover:text-accent",
            )}
          >
            <Heart className={cn("h-5 w-5", wished && "fill-accent")} />
          </button>
        </div>
        {addItem.isError && <p className="text-sm text-destructive">{(addItem.error as Error).message}</p>}

        {/* delivery */}
        <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> {deliveryLine || "Standard delivery in 3–5 days · Free shipping over ৳2,000"}
          </span>
        </div>

        {/* FN "We see similar styles" module */}
        <SimilarStylesCard
          queryImage={images[imageIdx] ?? product.thumbnail}
          similar={similarStyles}
          styleWith={styleWith}
        />

        <Accordions product={product} shippingReturns={shippingReturns} />
      </div>

      <AnimatePresence>
        {lightbox && (
          <Lightbox images={images} index={imageIdx} setIndex={setImageIdx} onClose={() => setLightbox(false)} alt={product.title} />
        )}
      </AnimatePresence>

      <SizeGuideModal
        open={sizeGuide}
        onClose={() => setSizeGuide(false)}
        guide={structuredGuide}
        content={sizeGuideContent}
      />
    </div>
  );
}

function ZoomImage({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <div
      ref={ref}
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={onMove}
      onClick={onOpen}
      className="relative aspect-[3/4] w-full cursor-zoom-in overflow-hidden bg-muted"
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 45vw"
        className="object-cover transition-transform duration-200"
        style={{ transform: zoom ? "scale(1.9)" : "scale(1)", transformOrigin: origin }}
      />
    </div>
  );
}

function Lightbox({
  images,
  index,
  setIndex,
  onClose,
  alt,
}: {
  images: string[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  alt: string;
}) {
  const prev = () => setIndex((index - 1 + images.length) % images.length);
  const next = () => setIndex((index + 1) % images.length);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-5 top-5 cursor-pointer text-white/80 hover:text-white">
        <X className="h-7 w-7" />
      </button>
      <button type="button" aria-label="Previous" onClick={prev} className="absolute left-4 cursor-pointer text-white/80 hover:text-white">
        <ChevronLeft className="h-9 w-9" />
      </button>
      <div className="relative h-[82vh] w-[90vw] max-w-3xl">
        <Image src={images[index] ?? images[0]!} alt={alt} fill sizes="90vw" className="object-contain" />
      </div>
      <button type="button" aria-label="Next" onClick={next} className="absolute right-4 cursor-pointer text-white/80 hover:text-white">
        <ChevronRight className="h-9 w-9" />
      </button>
      <div className="absolute bottom-5 flex gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Image ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn("relative h-14 w-11 overflow-hidden", i === index ? "ring-2 ring-white" : "opacity-60")}
          >
            <Image src={src} alt="" fill sizes="44px" className="object-cover" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/** Detects whether the stored description is rich HTML vs plain text. */
const isHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

function Accordions({ product, shippingReturns }: { product: StoreProductDetail; shippingReturns?: string }) {
  const [open, setOpen] = useState<string | null>("details");
  const { description, material, care, occasion = [], style = [], trend = [], tags = [] } = product;
  const attrs: { label: string; values: string[] }[] = [
    { label: "Occasion", values: occasion },
    { label: "Style", values: style },
    { label: "Trend", values: trend },
  ].filter((a) => a.values.length > 0);
  const hasMaterials = Boolean(material || care);

  const panels = [
    { key: "details", label: "Product Details" },
    ...(hasMaterials ? [{ key: "materials", label: "Materials & Care" }] : []),
    { key: "shipping", label: "Shipping & Returns" },
  ];

  return (
    <div className="mt-1 border-t border-border">
      {panels.map((p) => {
        const isOpen = open === p.key;
        return (
          <div key={p.key} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : p.key)}
              className="flex w-full cursor-pointer items-center justify-between py-4 text-left text-sm font-semibold uppercase tracking-wide"
            >
              {p.label}
              {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
            {isOpen && p.key === "details" && (
              <div className="max-h-[460px] overflow-y-auto pb-4 pr-1">
                {description && isHtml(description) ? (
                  <div
                    className="prose-pdp text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description || "Premium materials with a considered fit."}
                  </p>
                )}
                {attrs.length > 0 && (
                  <dl className="mt-4 flex flex-col gap-2 text-sm">
                    {attrs.map((a) => (
                      <div key={a.label} className="flex gap-2">
                        <dt className="w-24 shrink-0 font-semibold text-foreground">{a.label}</dt>
                        <dd className="text-muted-foreground">{a.values.join(", ")}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span key={t} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isOpen && p.key === "materials" && (
              <div className="max-h-[460px] overflow-y-auto pb-4 pr-1 text-sm leading-relaxed text-muted-foreground">
                {material && (
                  <div>
                    <span className="font-semibold text-foreground">Composition: </span>
                    {isHtml(material) ? <span className="prose-pdp [&_li]:ml-4 [&_li]:list-disc" dangerouslySetInnerHTML={{ __html: material }} /> : material}
                  </div>
                )}
                {care && (
                  <div className="mt-1.5">
                    <span className="font-semibold text-foreground">Care: </span>
                    {isHtml(care) ? <span className="prose-pdp [&_li]:ml-4 [&_li]:list-disc" dangerouslySetInnerHTML={{ __html: care }} /> : care}
                  </div>
                )}
              </div>
            )}
            {isOpen && p.key === "shipping" && (
              shippingReturns && shippingReturns.trim() ? (
                isHtml(shippingReturns) ? (
                  <div
                    className="prose-pdp max-h-[460px] overflow-y-auto pb-4 pr-1 text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:my-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1"
                    dangerouslySetInnerHTML={{ __html: shippingReturns }}
                  />
                ) : (
                  <p className="max-h-[460px] overflow-y-auto whitespace-pre-wrap pb-4 pr-1 text-sm leading-relaxed text-muted-foreground">{shippingReturns}</p>
                )
              ) : (
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  Standard delivery in 3–5 days. Cash on Delivery available. Free returns within 30 days.
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
