import {
  bannerConfigSchema,
  brandCarouselConfigSchema,
  categoryGridConfigSchema,
  editorialConfigSchema,
  heroConfigSchema,
  marqueeConfigSchema,
  productRowConfigSchema,
} from "@ecom/cms";
import { fetchProducts } from "@/lib/commerce";
import { Marquee } from "./marquee";
import { Hero } from "./hero";
import { ProductRow } from "./product-row";
import { CategoryGrid } from "./category-grid";
import { Editorial } from "./editorial";
import { Banner } from "./banner";
import { BrandCarousel, type BrandSlide } from "./brand-carousel";

export interface SectionData {
  id: string;
  type: string;
  config: unknown;
}

function logInvalid(section: SectionData, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`Invalid config for section ${section.id} (${section.type})`, error);
  }
}

/**
 * Renders one CMS section. Config is validated with the schema matching its
 * type — each branch yields a correctly typed config, no casts. An invalid
 * block is skipped (and logged in dev) rather than crashing the page.
 */
export async function SectionRenderer({ section }: { section: SectionData }) {
  switch (section.type) {
    case "MARQUEE": {
      const r = marqueeConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      return <Marquee config={r.data} />;
    }
    case "HERO": {
      const r = heroConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      return <Hero config={r.data} />;
    }
    case "CATEGORY_GRID": {
      const r = categoryGridConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      return <CategoryGrid config={r.data} />;
    }
    case "EDITORIAL": {
      const r = editorialConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      return <Editorial config={r.data} />;
    }
    case "BANNER": {
      const r = bannerConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      return <Banner config={r.data} />;
    }
    case "PRODUCT_ROW": {
      const r = productRowConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      const products = await fetchProducts(r.data.source, r.data.limit);
      return <ProductRow config={r.data} products={products} />;
    }
    case "BRAND_CAROUSEL": {
      const r = brandCarouselConfigSchema.safeParse(section.config);
      if (!r.success) return logInvalid(section, r.error.flatten()), null;
      const slides: BrandSlide[] = r.data.slides.map((s) => ({
        image: s.media.url,
        eyebrow: s.eyebrow,
        title: s.title,
        href: s.href,
        cta: s.cta,
      }));
      return <BrandCarousel slides={slides} intervalMs={r.data.intervalMs} />;
    }
    default:
      return null;
  }
}
