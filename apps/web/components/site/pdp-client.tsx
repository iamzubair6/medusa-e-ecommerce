"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button, cn } from "@ecom/ui";
import type { StoreProductDetail, StoreVariant } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";

/** Find the variant matching all selected options, if any. */
function matchVariant(
  variants: StoreVariant[],
  selected: Record<string, string>,
  optionTitles: string[],
): StoreVariant | undefined {
  if (optionTitles.some((t) => !selected[t])) return undefined;
  return variants.find((v) => optionTitles.every((t) => v.options[t] === selected[t]));
}

export function PdpClient({ product }: { product: StoreProductDetail }) {
  const [activeImage, setActiveImage] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { openCart } = useCartUI();

  const optionTitles = product.options.map((o) => o.title);
  const variant = useMemo(
    () => matchVariant(product.variants, selected, optionTitles),
    [product.variants, selected, optionTitles],
  );
  const ready = optionTitles.length === 0 || !!variant;
  const price = variant?.price ?? product.price;

  const choose = (title: string, value: string) => {
    setSelected((s) => ({ ...s, [title]: value }));
    setAdded(false);
  };

  const addToBag = () => {
    if (optionTitles.length > 0 && !variant) return;
    addItem.mutate(
      { variantId: variant?.id ?? product.id, quantity: qty },
      {
        onSuccess: () => {
          setAdded(true);
          openCart();
        },
      },
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Gallery */}
      <div className="flex flex-col gap-4">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={product.images[activeImage] ?? product.thumbnail}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-3">
            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`View image ${i + 1}`}
                aria-current={i === activeImage}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "relative aspect-[4/5] w-20 shrink-0 cursor-pointer overflow-hidden rounded-md ring-offset-2 transition",
                  i === activeImage ? "ring-2 ring-gold" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{product.title}</h1>
          <p className="mt-2 text-xl font-semibold">{price}</p>
        </div>

        {product.options.map((option) => (
          <div key={option.title} className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {option.title}
            </span>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isActive = selected[option.title] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(option.title, value)}
                    aria-pressed={isActive}
                    className={cn(
                      "min-w-11 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quantity
          </span>
          <div className="flex w-fit items-center rounded-md border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="cursor-pointer p-3 hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="cursor-pointer p-3 hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Button
          variant="gold"
          size="lg"
          disabled={!ready}
          loading={addItem.isPending}
          onClick={addToBag}
          className="w-full sm:w-auto"
        >
          {added && !addItem.isPending ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
          {added && !addItem.isPending ? "Added to bag" : ready ? "Add to bag" : "Select options"}
        </Button>
        {addItem.isError && (
          <p className="text-sm text-destructive">{(addItem.error as Error).message}</p>
        )}

        {product.description && (
          <div className="border-t border-border pt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">Details</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
