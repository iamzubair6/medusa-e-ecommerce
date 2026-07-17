import "server-only";
import { env, pipeline, type ImageFeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Semantic image embeddings for visual search — CLIP (ViT-B/32, quantized),
 * running fully on our own server via transformers.js. One implementation for
 * BOTH the index and shopper queries.
 *
 * Unlike the previous color-layout descriptor, CLIP understands what's IN the
 * photo (garment type, cut, texture), so a query photo of joggers matches
 * joggers — not everything grey. Verified on the live catalog: every test
 * query ranks the correct product first.
 *
 * Model files (~90 MB) download once per instance to the cache dir and load
 * lazily on first use — a cold instance pays one slow first search.
 */

export const EMBED_DIM = 512;
const MODEL = "Xenova/clip-vit-base-patch32";

env.cacheDir = process.env.HF_CACHE_DIR ?? "/tmp/hf-cache";

let extractorPromise: Promise<ImageFeatureExtractionPipeline> | null = null;
function getExtractor(): Promise<ImageFeatureExtractionPipeline> {
  extractorPromise ??= pipeline("image-feature-extraction", MODEL, { dtype: "q8" });
  return extractorPromise;
}

function l2Normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export async function embedBufferServer(buf: Buffer): Promise<number[] | null> {
  try {
    const extractor = await getExtractor();
    // Copy into a plain ArrayBuffer-backed view — Node Buffers may be typed
    // over SharedArrayBuffer, which Blob's constructor type rejects.
    const out = await extractor(new Blob([Uint8Array.from(buf)]));
    const v = Array.from(out.data as Float32Array).map(Number);
    if (v.length !== EMBED_DIM) return null;
    return l2Normalize(v);
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
