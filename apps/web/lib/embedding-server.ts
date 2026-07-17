import "server-only";
import sharp from "sharp";

/**
 * Server-side image descriptor for visual search. ONE implementation for both
 * the index and shopper queries (the old split browser/server methods produced
 * incomparable vectors).
 *
 * Not a neural embedding — a color-layout descriptor made honest:
 * - sharp decodes ANY format (webp/png/jpeg — the old code silently dropped
 *   everything but JPEG, so R2-hosted product photos never got indexed),
 * - attention-cropped square focuses cells on the garment, not the backdrop,
 * - per-vector mean subtraction removes the shared white-studio component that
 *   made every catalog shot look alike to plain average-color matching.
 * Swap `embedBufferServer` for a CLIP call later without touching callers.
 */

export const EMBED_SIZE = 16;
export const EMBED_DIM = EMBED_SIZE * EMBED_SIZE * 3; // 768

export async function embedBufferServer(buf: Buffer): Promise<number[] | null> {
  try {
    const { data } = await sharp(buf)
      .resize(EMBED_SIZE, EMBED_SIZE, { fit: "cover", position: sharp.strategy.attention })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (data.length < EMBED_DIM) return null;

    const v = new Array<number>(EMBED_DIM);
    let mean = 0;
    for (let i = 0; i < EMBED_DIM; i++) {
      const x = data[i]! / 255;
      v[i] = x;
      mean += x;
    }
    mean /= EMBED_DIM;

    let sumSq = 0;
    for (let i = 0; i < EMBED_DIM; i++) {
      const centred = v[i]! - mean;
      v[i] = centred;
      sumSq += centred * centred;
    }
    const norm = Math.sqrt(sumSq) || 1;
    return v.map((x) => x / norm);
  } catch {
    return null;
  }
}

export async function embedUrlServer(url: string): Promise<number[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return embedBufferServer(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}
