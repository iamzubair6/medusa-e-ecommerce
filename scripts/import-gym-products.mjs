/**
 * import-gym-products.mjs — one-shot import of the owner's gym-product folder
 * (~/Downloads/gym product) into Medusa with R2-hosted images.
 *
 * Local:  SK=<admin key> SECRET=<admin session secret> PUB=<publishable key> \
 *           node scripts/import-gym-products.mjs
 * Live:   add LIVE=1 MEDUSA_URL=https://medusabd.onrender.com \
 *           WEB_URL=https://medusa-e-ecommerce-web.vercel.app
 *
 * Category IDs are resolved at runtime by handle, so it survives reseeds.
 * Safe to re-run only after a catalog wipe (duplicate handles otherwise).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const ROOT = "/Users/zubair/Downloads/gym product";
const MEDUSA = process.env.MEDUSA_URL || "http://localhost:9000";
const WEB = process.env.WEB_URL || "http://localhost:3200";
const SK = process.env.SK, SECRET = process.env.SECRET;

const catRes = await fetch(`${MEDUSA}/store/product-categories?limit=100&fields=id,handle`, {
  headers: { "x-publishable-api-key": process.env.PUB },
});
const catRows = (await catRes.json()).product_categories;
const CAT = Object.fromEntries(catRows.map((c) => [c.handle, c.id]));

const sizes = [
  { size: "S", stock: 25 }, { size: "M", stock: 25 },
  { size: "L", stock: 25 }, { size: "XL", stock: 25 },
];

// Every product's images come ONLY from its own folder (LESSONS #9).
const PRODUCTS = [
  { title: "Soft Sculpt Flared Legging", dir: "Flare", division: "women", cats: ["activewear", "bottoms", "women"], color: "Black", swatch: "#1b1b1b", price: 1990, desc: "High-rise flared leggings with a soft sculpting knit that smooths and lifts — studio to street." },
  { title: "Lift Seamless Midi Tank", dir: "Lift Seamless Tank", division: "women", cats: ["activewear", "tops", "women"], color: "Calm Pink", swatch: "#e8b4c0", price: 990, desc: "Seamless midi tank with a built-in shelf for light support and a second-skin feel." },
  { title: "Everyday Seamless Long Sleeve", dir: "Long Sleeve", division: "women", cats: ["activewear", "tops", "women"], color: "Stealth Blue", swatch: "#3b5b87", price: 1290, desc: "A breathable seamless long sleeve for warm-ups, runs and rest days alike." },
  { title: "Lift Seamless Scrunch Leggings", dir: "Scrunch Bum", division: "women", cats: ["activewear", "bottoms", "women"], color: "Calm Pink", swatch: "#e8b4c0", price: 1890, desc: "Scrunch-detail seamless leggings that contour and hold through every rep." },
  { title: "Training Oversized Tee", dir: "girl ovesized t-shirt", division: "women", cats: ["activewear", "tops", "women"], color: "White", swatch: "#f2efe9", price: 1190, desc: "A boxy oversized training tee in heavyweight cotton — thrown on, tucked in, lived in." },
  { title: "Nova Gym Shorts", dir: "girl gym shorts", division: "women", cats: ["activewear", "bottoms", "women"], price: 1090, desc: "Sweat-wicking gym shorts with a flattering high waist — three colours, zero distractions.",
    colors: [
      { name: "Brown", swatch: "#6b4a3a", sub: "brown" },
      { name: "Navy", swatch: "#26324a", sub: "blue" },
      { name: "Maroon", swatch: "#7b2d3b", sub: "maroon" },
    ] },
  { title: "Crest Long Sleeve Tee", dir: "men full sleve", division: "men", cats: ["activewear", "tops", "men"], color: "Black", swatch: "#1b1b1b", price: 1390, desc: "A clean long-sleeve training tee in soft-handle jersey — gym-ready, street-legal." },
  { title: "Arrival Woven Joggers", dir: "men joggers", division: "men", cats: ["activewear", "bottoms", "men"], color: "Grey", swatch: "#8a8a8a", price: 1690, desc: "Lightweight woven joggers with a tapered silhouette and zip pockets." },
  { title: "Crest Shorts", dir: "men shorts", division: "men", cats: ["activewear", "bottoms", "men"], color: "Light Grey", swatch: "#b9b9b9", price: 1190, desc: "Everyday training shorts in a breathable marl knit." },
  { title: "Arrival Tank", dir: "men tank", division: "men", cats: ["activewear", "tops", "men"], color: "Black", swatch: "#1b1b1b", price: 890, desc: "A featherweight training tank with deep armholes for full range of motion." },
];

const imagesIn = (dir) =>
  readdirSync(dir).filter((f) => /\.(webp|jpe?g|png)$/i.test(f)).sort().map((f) => join(dir, f));

async function upload(paths) {
  const fd = new FormData();
  for (const p of paths) {
    const buf = readFileSync(p);
    const type = p.endsWith(".webp") ? "image/webp" : p.endsWith(".png") ? "image/png" : "image/jpeg";
    fd.append("files", new Blob([buf], { type }), p.split("/").pop());
  }
  const res = await fetch(`${MEDUSA}/admin/uploads`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${SK}:`).toString("base64")}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return d.files.map((f) => f.url);
}

function session() {
  const p = { uid: "import", email: "local@test", name: "Import", role: "ADMIN", exp: Math.floor(Date.now() / 1000) + 1800 };
  const b = Buffer.from(JSON.stringify(p)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
  return `${b}.${sig}`;
}

const cookie = `admin_session=${session()}`;

for (const P of PRODUCTS) {
  const dir = join(ROOT, P.dir);
  let colors;
  if (P.colors) {
    colors = [];
    for (const c of P.colors) {
      const urls = await upload(imagesIn(join(dir, c.sub)).slice(0, 6));
      colors.push({ name: c.name, swatch: c.swatch, price: P.price, images: urls, sizes });
    }
  } else {
    const urls = await upload(imagesIn(dir).slice(0, 6));
    colors = [{ name: P.color, swatch: P.swatch, price: P.price, images: urls, sizes }];
  }
  const payload = {
    title: P.title,
    description: P.desc,
    categoryIds: P.cats.map((c) => CAT[c]),
    division: P.division,
    occasion: ["Everyday"],
    style: ["Sporty"],
    trend: [],
    colors,
  };
  const res = await fetch(`${WEB}/api/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  console.log(res.ok ? "CREATED" : "FAILED", P.title, res.status, res.ok ? "" : JSON.stringify(body).slice(0, 300));
}
