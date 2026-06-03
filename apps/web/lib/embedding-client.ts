/**
 * Client-side image embedding (browser canvas). Produces a small, normalized
 * RGB feature vector from a downscaled image — captures overall color + layout
 * for visual-similarity search. No native deps; runs entirely in the browser.
 */

export const EMBED_SIZE = 16;
export const EMBED_DIM = EMBED_SIZE * EMBED_SIZE * 3; // 768

export function embedImageElement(img: HTMLImageElement): number[] {
  const canvas = document.createElement("canvas");
  canvas.width = EMBED_SIZE;
  canvas.height = EMBED_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(img, 0, 0, EMBED_SIZE, EMBED_SIZE);
  const { data } = ctx.getImageData(0, 0, EMBED_SIZE, EMBED_SIZE); // RGBA
  const v: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]! / 255;
    const g = data[i + 1]! / 255;
    const b = data[i + 2]! / 255;
    v.push(r, g, b);
    sumSq += r * r + g * g + b * b;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return v.map((x) => x / norm);
}

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Embed a remote image URL (requires CORS-enabled host, e.g. Unsplash). */
export async function embedUrl(url: string): Promise<number[]> {
  const img = await loadImage(url, true);
  return embedImageElement(img);
}

/** Embed a user-selected file. */
export async function embedFile(file: File): Promise<number[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url, false);
    return embedImageElement(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}
