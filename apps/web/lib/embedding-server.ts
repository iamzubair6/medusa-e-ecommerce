import "server-only";
import jpeg from "jpeg-js";

/**
 * Server-side image embedding — mirrors lib/embedding-client.ts (16×16 RGB,
 * L2-normalized → 768-dim) but runs in Node/Bun using a pure-JS JPEG decoder,
 * so the visual-search index can be rebuilt headlessly (no browser canvas).
 *
 * Cells are emitted row-major (matching the browser's getImageData order) so
 * vectors stay comparable to query embeddings computed in the browser.
 */

export const EMBED_SIZE = 16;
export const EMBED_DIM = EMBED_SIZE * EMBED_SIZE * 3; // 768

/** Unsplash serves WebP by default; force JPEG so jpeg-js can decode it. */
function asJpeg(url: string): string {
  if (!/images\.unsplash\.com/.test(url)) return url;
  return url.includes("?") ? `${url}&fm=jpg` : `${url}?fm=jpg`;
}

export async function embedUrlServer(url: string): Promise<number[] | null> {
  let buf: Buffer;
  try {
    const res = await fetch(asJpeg(url), { cache: "no-store" });
    if (!res.ok) return null;
    buf = Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }

  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
  } catch {
    return null; // not a JPEG (e.g. PNG/WebP upload) — skip
  }

  const { width, height, data } = decoded;
  if (!width || !height) return null;

  const cells = EMBED_SIZE * EMBED_SIZE;
  const sum = new Float64Array(cells * 3);
  const count = new Float64Array(cells);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(EMBED_SIZE - 1, Math.floor((y / height) * EMBED_SIZE));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(EMBED_SIZE - 1, Math.floor((x / width) * EMBED_SIZE));
      const px = (y * width + x) * 4;
      const base = (gy * EMBED_SIZE + gx) * 3;
      const ci = gy * EMBED_SIZE + gx;
      sum[base] = sum[base]! + data[px]!;
      sum[base + 1] = sum[base + 1]! + data[px + 1]!;
      sum[base + 2] = sum[base + 2]! + data[px + 2]!;
      count[ci] = count[ci]! + 1;
    }
  }

  const v: number[] = [];
  let sumSq = 0;
  for (let ci = 0; ci < cells; ci++) {
    const c = count[ci] || 1;
    const r = sum[ci * 3]! / c / 255;
    const g = sum[ci * 3 + 1]! / c / 255;
    const b = sum[ci * 3 + 2]! / c / 255;
    v.push(r, g, b);
    sumSq += r * r + g * g + b * b;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return v.map((x) => x / norm);
}
