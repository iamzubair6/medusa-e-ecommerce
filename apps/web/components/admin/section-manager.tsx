"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { Badge, Card, cn } from "@ecom/ui";
import {
  bannerConfigSchema,
  categoryGridConfigSchema,
  editorialConfigSchema,
  heroConfigSchema,
  marqueeConfigSchema,
  productRowConfigSchema,
} from "@ecom/cms";
import { HeroEditor } from "./editors/hero-editor";
import { MarqueeEditor } from "./editors/marquee-editor";
import { BannerEditor } from "./editors/banner-editor";
import { ProductRowEditor } from "./editors/product-row-editor";
import { CategoryGridEditor } from "./editors/category-grid-editor";
import { EditorialEditor } from "./editors/editorial-editor";

export interface AdminSection {
  id: string;
  type: string;
  position: number;
  config: unknown;
}

function Editor({ section }: { section: AdminSection }) {
  switch (section.type) {
    case "HERO": {
      const r = heroConfigSchema.safeParse(section.config);
      return r.success ? <HeroEditor sectionId={section.id} config={r.data} /> : <Invalid />;
    }
    case "MARQUEE": {
      const r = marqueeConfigSchema.safeParse(section.config);
      return r.success ? <MarqueeEditor sectionId={section.id} config={r.data} /> : <Invalid />;
    }
    case "BANNER": {
      const r = bannerConfigSchema.safeParse(section.config);
      return r.success ? <BannerEditor sectionId={section.id} config={r.data} /> : <Invalid />;
    }
    case "PRODUCT_ROW": {
      const r = productRowConfigSchema.safeParse(section.config);
      return r.success ? <ProductRowEditor sectionId={section.id} config={r.data} /> : <Invalid />;
    }
    case "CATEGORY_GRID": {
      const r = categoryGridConfigSchema.safeParse(section.config);
      return r.success ? <CategoryGridEditor sectionId={section.id} config={r.data} /> : <Invalid />;
    }
    case "EDITORIAL": {
      const r = editorialConfigSchema.safeParse(section.config);
      return r.success ? <EditorialEditor sectionId={section.id} config={r.data} /> : <Invalid />;
    }
    default:
      return <Invalid />;
  }
}

function Invalid() {
  return <p className="text-sm text-destructive">This block has invalid or unsupported data.</p>;
}

function sectionLabel(section: AdminSection): string {
  const c = section.config as { heading?: string; headline?: string };
  return c?.headline ?? c?.heading ?? section.type.replace("_", " ").toLowerCase();
}

export function SectionManager({ sections: initial }: { sections: AdminSection[] }) {
  const router = useRouter();
  const [sections, setSections] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    setSections(next);
    setReordering(true);
    await fetch("/api/admin/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
    });
    setReordering(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {reordering && <p className="text-xs text-muted-foreground">Saving order…</p>}
      {sections.map((section, i) => {
        const open = openId === section.id;
        return (
          <Card key={section.id} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === sections.length - 1}
                  onClick={() => move(i, 1)}
                  className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <Badge variant="muted">{section.type.replace("_", " ")}</Badge>
              <span className="flex-1 truncate text-sm font-medium capitalize">{sectionLabel(section)}</span>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : section.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  "transition-colors hover:bg-muted",
                )}
              >
                {open ? "Close" : "Edit"}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {open && (
              <div className="border-t border-border bg-muted/30 p-5">
                <Editor section={section} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
