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
  Sparkles,
  Star,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { Button, cn } from "@ecom/ui";
import type { StoreProductDetail } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";
import { useVisualSearch } from "@/lib/visual-search-context";
import { SizeGuideModal } from "./size-guide-modal";

export function PdpClient({ product }: { product: StoreProductDetail }) {
  const [colorIdx, setColorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [sizeGuide, setSizeGuide] = useState(false);

  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const { openSimilar } = useVisualSearch();

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
            <button type="button" className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-foreground text-foreground" />
              ))}
            </span>
            <span className="text-xs text-muted-foreground underline">(24)</span>
          </div>
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
            aria-label="Add to wishlist"
            className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border hover:border-foreground hover:text-accent"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>
        {addItem.isError && <p className="text-sm text-destructive">{(addItem.error as Error).message}</p>}

        {/* delivery + shop similar */}
        <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Standard delivery in 3–5 days · Free shipping over ৳2,000
          </span>
          <button
            type="button"
            onClick={() => openSimilar(product.id, images[imageIdx] ?? product.thumbnail)}
            className="flex w-fit cursor-pointer items-center gap-1.5 text-foreground underline-offset-4 hover:underline"
          >
            <Sparkles className="h-4 w-4" /> Shop Similar
          </button>
        </div>

        <Accordions description={product.description} />
      </div>

      <AnimatePresence>
        {lightbox && (
          <Lightbox images={images} index={imageIdx} setIndex={setImageIdx} onClose={() => setLightbox(false)} alt={product.title} />
        )}
      </AnimatePresence>

      <SizeGuideModal open={sizeGuide} onClose={() => setSizeGuide(false)} />
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

const PANELS = [
  { key: "details", label: "Product Details" },
  { key: "shipping", label: "Shipping & Returns" },
  { key: "reviews", label: "Reviews" },
] as const;

function Accordions({ description }: { description: string }) {
  const [open, setOpen] = useState<string | null>("details");
  return (
    <div className="mt-1 border-t border-border">
      {PANELS.map((p) => {
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
            {isOpen && (
              <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                {p.key === "details"
                  ? description || "Premium materials with a considered fit."
                  : p.key === "shipping"
                    ? "Standard delivery in 3–5 days. Free returns within 30 days."
                    : "No reviews yet — be the first to review this piece."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
