import {
  Truck,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Headphones,
  Tag,
  Gift,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Container, cn } from "@ecom/ui";
import type { ValuePropsConfig, ValuePropIcon } from "@ecom/cms";

const iconMap: Record<ValuePropIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  "credit-card": CreditCard,
  headset: Headphones,
  tag: Tag,
  gift: Gift,
  sparkles: Sparkles,
};

/** A strip of trust badges (icon + label + sublabel). */
export function ValueProps({ config }: { config: ValuePropsConfig }) {
  return (
    <section className="border-y border-border bg-muted/40 py-6">
      <Container>
        <ul
          className={cn(
            "grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3",
            config.items.length >= 4 && "lg:grid-cols-4",
            config.items.length >= 5 && "lg:grid-cols-5",
            config.items.length >= 6 && "lg:grid-cols-6",
          )}
        >
          {config.items.map((item, i) => {
            const Icon = iconMap[item.icon];
            return (
              <li key={i} className="flex items-center gap-3">
                <Icon className="h-6 w-6 shrink-0 text-gold" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">{item.label}</p>
                  {item.sublabel && (
                    <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
