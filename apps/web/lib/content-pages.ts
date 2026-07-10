import { z } from "zod";

/**
 * Admin-managed static content pages (footer: help, company, legal…), stored in
 * the CMS SiteSetting "contentPages" and rendered by the root catch-all route
 * `app/[...slug]`. Pages are an editable list so the admin can add/remove pages
 * without a deploy — slugs may be nested ("help/shipping").
 */
export const contentPageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, "Lowercase letters, numbers and dashes only (use / for nesting)"),
  title: z.string().min(1).max(120),
  body: z.string().max(20000).default(""),
  enabled: z.boolean().default(true),
});

/** First segments owned by real routes — a content page there would save but never render. */
const RESERVED_SEGMENTS = new Set([
  "admin", "api", "account", "c", "cart", "checkout", "collections", "pages", "products", "track", "wishlist",
]);

export const contentPagesSchema = z.object({
  pages: z
    .array(contentPageSchema)
    .max(50)
    .default([])
    .superRefine((pages, ctx) => {
      const seen = new Set<string>();
      pages.forEach((page, i) => {
        const first = page.slug.split("/")[0] ?? "";
        if (RESERVED_SEGMENTS.has(first)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, "slug"],
            message: `"${first}" is a reserved route — pick another slug`,
          });
        }
        if (seen.has(page.slug)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, "slug"], message: "Duplicate slug" });
        }
        seen.add(page.slug);
      });
    }),
});

export type ContentPage = z.infer<typeof contentPageSchema>;
export type ContentPages = z.infer<typeof contentPagesSchema>;

const p = (heading: string, lines: string[]) =>
  `<h2>${heading}</h2>` + lines.map((l) => `<p>${l}</p>`).join("");

/** Default copy so every footer link resolves out of the box; all editable in /admin/content-pages. */
export const DEFAULT_CONTENT_PAGES: ContentPages = {
  pages: [
    {
      slug: "help",
      title: "Help Center",
      enabled: true,
      body:
        p("How can we help?", [
          "Find quick answers about orders, delivery, sizing and returns.",
          'Track any order anytime from <a href="/track">Track Order</a> — you only need your order ID and phone number.',
        ]) +
        p("Popular topics", [
          '<a href="/help/shipping">Shipping &amp; delivery</a> · <a href="/help/returns">Returns &amp; exchanges</a> · <a href="/help/size-guide">Size guide</a>',
        ]) +
        p("Still stuck?", ['Reach us via the <a href="/contact">Contact</a> page — we reply within 24 hours.']),
    },
    {
      slug: "help/size-guide",
      title: "Size Guide",
      enabled: true,
      body:
        p("Find your fit", [
          "Our pieces run true to size. If you are between sizes, size up for a relaxed fit or down for a snatched silhouette.",
        ]) +
        "<h2>Women</h2><ul><li>XS — bust 32&quot;, waist 24&quot;, hips 34&quot;</li><li>S — bust 34&quot;, waist 26&quot;, hips 36&quot;</li><li>M — bust 36&quot;, waist 28&quot;, hips 38&quot;</li><li>L — bust 38&quot;, waist 30&quot;, hips 40&quot;</li><li>XL — bust 40&quot;, waist 32&quot;, hips 42&quot;</li></ul>" +
        "<h2>Men</h2><ul><li>S — chest 36&quot;, waist 30&quot;</li><li>M — chest 38&quot;, waist 32&quot;</li><li>L — chest 40&quot;, waist 34&quot;</li><li>XL — chest 42&quot;, waist 36&quot;</li></ul>" +
        p("Shoes", ["Shoe sizes are listed in US sizing on each product page."]),
    },
    {
      slug: "help/shipping",
      title: "Shipping & Delivery",
      enabled: true,
      body:
        p("Delivery in Bangladesh", [
          "Standard delivery arrives in 3–5 working days, nationwide.",
          "Delivery is ৳60 flat — free on orders over ৳2,000.",
          "Cash on Delivery is available everywhere we ship.",
        ]) +
        p("Order tracking", ['The moment your order ships you can follow it from <a href="/track">Track Order</a>.']),
    },
    {
      slug: "help/returns",
      title: "Returns & Exchanges",
      enabled: true,
      body:
        p("Our promise", [
          "Not feeling it? You have 7 days from delivery to request a return or exchange.",
          "Items must be unworn, unwashed and with tags attached. Bodysuits, swimwear and beauty are final sale for hygiene reasons.",
        ]) +
        p("How it works", [
          '1. Go to <a href="/contact">Contact</a> and send your order ID with the item you want to return.',
          "2. We arrange pickup or a drop-off point.",
          "3. Refunds are issued within 5–7 days of the item reaching us — original payment method or store credit, your choice.",
        ]),
    },
    {
      slug: "about",
      title: "About Maison",
      enabled: true,
      body:
        p("Editorial luxury, for every day", [
          "Maison is a fashion house built for the way you actually live — statement pieces and everyday essentials, cut with intention and priced without the ego.",
          "We drop new styles weekly across Women, Men, Curve, Kids, Beauty and Sport — designed in-house, made in small runs.",
        ]) +
        p("Why we exist", [
          "Great style should not require a stylist's budget. Every Maison piece is designed to photograph beautifully, wear comfortably and last beyond the trend cycle.",
        ]),
    },
    {
      slug: "careers",
      title: "Careers",
      enabled: true,
      body:
        p("Work with us", [
          "We are a small, fast team building the future of fashion retail in Bangladesh — across design, merchandising, engineering and content.",
          "There are no open roles right now, but we are always happy to meet exceptional people.",
        ]) +
        p("Introduce yourself", ['Send your portfolio or CV via the <a href="/contact">Contact</a> page with the subject "Careers".']),
    },
    {
      slug: "contact",
      title: "Contact Us",
      enabled: true,
      body:
        p("We reply within 24 hours", [
          "Email: <strong>support@maison.example</strong>",
          "Phone / WhatsApp: <strong>+880 1XXX-XXXXXX</strong> (10am–8pm, Sat–Thu)",
        ]) +
        p("Before you write", [
          'Order questions move fastest when you include your order ID — you can also self-serve from <a href="/track">Track Order</a>.',
        ]),
    },
    {
      slug: "sustainability",
      title: "Sustainability",
      enabled: true,
      body:
        p("Fashion, responsibly", [
          "We produce in small, demand-led runs to avoid dead stock, and we re-use studio samples across shoots instead of discarding them.",
          "Packaging is plastic-light: recycled mailers and paper tape wherever our couriers allow it.",
        ]) +
        p("Where we are honest", [
          "We are early in this journey. As we grow we will publish supplier standards and material sourcing on this page.",
        ]),
    },
    {
      slug: "gift-cards",
      title: "Gift Cards",
      enabled: true,
      body:
        p("Give them the choice", [
          "Digital gift cards are <strong>coming soon</strong> — instant delivery by email or SMS, redeemable at checkout.",
          'Want to be first to know? Join the list from the signup box in the footer, or <a href="/contact">contact us</a> to reserve one.',
        ]),
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      enabled: true,
      body:
        p("What we collect", [
          "Account details (name, phone, email, address) you give us at signup or checkout, plus order history and device data used to keep the site secure.",
        ]) +
        p("How we use it", [
          "To fulfil orders, provide delivery updates, prevent fraud and — only if you opt in — send offers. We never sell your personal data.",
        ]) +
        p("Your choices", [
          'You can unsubscribe from marketing anytime, and request a copy or deletion of your data via the <a href="/contact">Contact</a> page.',
        ]),
    },
    {
      slug: "terms",
      title: "Terms of Service",
      enabled: true,
      body:
        p("The basics", [
          "By ordering from Maison you agree to these terms. Prices are shown in BDT and include VAT where applicable.",
          "We may cancel and refund any order affected by a pricing or stock error — you will always be notified first.",
        ]) +
        p("Returns & disputes", [
          'Returns follow our <a href="/help/returns">Returns &amp; Exchanges</a> policy. Disputes are governed by the laws of Bangladesh.',
        ]),
    },
  ],
};

/**
 * Parse the raw CMS value. Defaults apply only when the setting was never saved
 * (or is unparseable) — a deliberately saved empty list stays empty.
 */
export function parseContentPages(raw: unknown): ContentPages {
  if (raw == null) return DEFAULT_CONTENT_PAGES;
  const r = contentPagesSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_CONTENT_PAGES;
}

/**
 * Server-side sanitize for admin-authored page HTML: strips script-capable tags,
 * inline event handlers and javascript: URLs. Not a full sanitizer — content is
 * staff-authored — but blocks pasted markup from reaching visitors executable.
 */
export function sanitizePageHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*\/?\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, "");
}

/** Look up an enabled page by its slug path segments. */
export function findContentPage(pages: ContentPages, segments: string[]): ContentPage | undefined {
  const slug = segments.join("/");
  return pages.pages.find((page) => page.enabled && page.slug === slug);
}
