import "server-only";
import sharp from "sharp";
import { z } from "zod";
import {
  AutoModelForObjectDetection,
  AutoProcessor,
  RawImage,
  pipeline,
  env,
  type ZeroShotImageClassificationPipeline,
} from "@huggingface/transformers";
import { type VisualQueryPart } from "@ecom/cms";
import { embedBufferServer } from "@/lib/embedding-server";

/**
 * Garment detection + division classification for shopper image searches.
 * Both models are free, self-hosted and share the transformers runtime with
 * the CLIP index (no external API):
 *  - YOLOS fine-tuned on Fashionpedia finds garment regions (top / bottom /
 *    dress / shoes / bag / accessory) → the hotspot dots on the query image.
 *    The ONNX repo ships no preprocessor config, so the (architecture-shared)
 *    YOLOS processor is loaded from Xenova/yolos-tiny.
 *  - CLIP zero-shot classifies the photo women / men / kids for the
 *    division=… filter, mirroring Fashion Nova's behavior.
 * Everything here is best-effort: a failure or timeout must never break the
 * search itself.
 */

const DETECT_MODEL = "onnx-community/yolos-fashionpedia-ONNX";
const PROCESSOR_REPO = "Xenova/yolos-tiny";
const CLIP_MODEL = "Xenova/clip-vit-base-patch32";

env.cacheDir = process.env.HF_CACHE_DIR ?? "/tmp/hf-cache";

/** Fashionpedia label → our hotspot group. Sub-part labels (sleeve, collar…) are ignored. */
const LABEL_GROUP: Record<string, string> = {
  "shirt, blouse": "top",
  "top, t-shirt, sweatshirt": "top",
  sweater: "top",
  cardigan: "top",
  vest: "top",
  jacket: "outerwear",
  coat: "outerwear",
  cape: "outerwear",
  pants: "bottom",
  shorts: "bottom",
  skirt: "bottom",
  "tights, stockings": "bottom",
  dress: "dress",
  jumpsuit: "dress",
  shoe: "shoes",
  "bag, wallet": "bag",
  glasses: "accessory",
  hat: "accessory",
  watch: "accessory",
  belt: "accessory",
  scarf: "accessory",
  tie: "accessory",
};

const DETECT_THRESHOLD = 0.35;
const MAX_PARTS = 4;
/**
 * Zero-shot division: an ensemble of prompts per division (single prompts
 * proved brittle — a woman-in-a-dress photo scored "kids" once in prod use).
 * Scores are summed per division; kids only wins with a clear margin, and a
 * detected dress/skirt biases to women unless men clearly dominates.
 */
const DIVISION_PROMPTS: { text: string; division: "women" | "men" | "kids" }[] = [
  { text: "women's fashion", division: "women" },
  { text: "a photo of a woman wearing an outfit", division: "women" },
  { text: "men's fashion", division: "men" },
  { text: "a photo of a man wearing an outfit", division: "men" },
  { text: "children's clothing", division: "kids" },
  { text: "a photo of a small child", division: "kids" },
];
const DIVISION_MIN_SUM = 0.45;
const KIDS_MARGIN = 0.2;

type Detector = {
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
  model: Awaited<ReturnType<typeof AutoModelForObjectDetection.from_pretrained>>;
};

let detectorPromise: Promise<Detector> | null = null;
function getDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(PROCESSOR_REPO),
      AutoModelForObjectDetection.from_pretrained(DETECT_MODEL, { dtype: "q8" }),
    ]);
    return { processor, model };
  })();
  return detectorPromise;
}

let zeroShotPromise: Promise<ZeroShotImageClassificationPipeline> | null = null;
function getZeroShot(): Promise<ZeroShotImageClassificationPipeline> {
  zeroShotPromise ??= pipeline("zero-shot-image-classification", CLIP_MODEL, { dtype: "q8" });
  return zeroShotPromise;
}

interface Detection {
  group: string;
  score: number;
  /** Pixel box on the analyzed image. */
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

/** Shape returned by YOLOS post-processing (per input image). */
interface RawDetections {
  boxes: [number, number, number, number][];
  classes: number[];
  scores: number[];
}

interface DetectionPostProcessor {
  post_process_object_detection(
    outputs: unknown,
    threshold: number,
    targetSizes: [number, number][],
  ): RawDetections[];
}

/** The YOLOS image processor has this method at runtime; the lib's base type omits it. */
function isDetectionPostProcessor(p: unknown): p is DetectionPostProcessor {
  return (
    typeof (p as { post_process_object_detection?: unknown })?.post_process_object_detection ===
    "function"
  );
}

async function detectGarments(image: RawImage): Promise<Detection[]> {
  const { processor, model } = await getDetector();
  if (!isDetectionPostProcessor(processor.image_processor)) return [];
  const inputs = await processor(image);
  const outputs = await model(inputs);
  const [result] = processor.image_processor.post_process_object_detection(
    outputs,
    DETECT_THRESHOLD,
    [[image.height, image.width]],
  );
  if (!result) return [];
  const cfg = z.object({ id2label: z.record(z.string()).optional() }).safeParse(model.config);
  const id2label = cfg.success ? (cfg.data.id2label ?? {}) : {};
  const best = new Map<string, Detection>();
  result.boxes.forEach((box, i) => {
    const label = id2label[String(result.classes[i])] ?? "";
    const group = LABEL_GROUP[label];
    const score = result.scores[i];
    if (!group || score === undefined) return;
    const [xmin, ymin, xmax, ymax] = box;
    const det: Detection = { group, score, box: { xmin, ymin, xmax, ymax } };
    const prev = best.get(group);
    if (!prev || det.score > prev.score) best.set(group, det);
  });
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, MAX_PARTS);
}

const zsOutputSchema = z.array(z.object({ label: z.string(), score: z.number() }));

async function classifyDivision(
  image: RawImage,
  detectedGroups: string[],
): Promise<string | undefined> {
  const zs = await getZeroShot();
  const raw: unknown = await zs(image, DIVISION_PROMPTS.map((p) => p.text));
  const out = zsOutputSchema.safeParse(Array.isArray(raw) ? raw.flat() : raw);
  if (!out.success) return undefined;

  const sums = new Map<string, number>();
  for (const item of out.data) {
    const division = DIVISION_PROMPTS.find((p) => p.text === item.label)?.division;
    if (division) sums.set(division, (sums.get(division) ?? 0) + item.score);
  }
  const ranked = [...sums.entries()].sort((a, b) => b[1] - a[1]);
  let [top] = ranked;
  if (!top || top[1] < DIVISION_MIN_SUM) return undefined;

  // Kids is CLIP's most common false positive — demand a clear win.
  if (top[0] === "kids" && ranked[1] && top[1] - ranked[1][1] < KIDS_MARGIN) {
    top = ranked[1];
  }
  // A dress/skirt in frame is a strong womenswear signal.
  const hasDress = detectedGroups.includes("dress");
  if (hasDress && top[0] !== "men") return "women";
  return top[0];
}

export interface QueryContext {
  division?: string;
  parts: VisualQueryPart[];
}

/**
 * Analyze a (already resized) query JPEG: garment hotspots — each with its own
 * CLIP vector from a padded crop, so clicking a dot re-scopes the search — plus
 * the women/men/kids division guess.
 */
export async function detectQueryContext(stored: Buffer): Promise<QueryContext> {
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(stored)]));
  const detections = await detectGarments(image);
  const division = await classifyDivision(image, detections.map((d) => d.group));

  const W = image.width;
  const H = image.height;
  const pad = Math.round(Math.max(W, H) * 0.04);
  const parts: VisualQueryPart[] = [];
  for (const det of detections) {
    // One degenerate box must not lose the remaining parts (or the division).
    try {
      const left = Math.max(0, Math.round(det.box.xmin) - pad);
      const top = Math.max(0, Math.round(det.box.ymin) - pad);
      const width = Math.min(W - left, Math.round(det.box.xmax - det.box.xmin) + pad * 2);
      const height = Math.min(H - top, Math.round(det.box.ymax - det.box.ymin) + pad * 2);
      if (width < 24 || height < 24) continue;
      const crop = await sharp(stored).extract({ left, top, width, height }).jpeg().toBuffer();
      const vector = await embedBufferServer(crop);
      if (!vector) continue;
      parts.push({
        label: det.group,
        box: { x: left / W, y: top / H, w: width / W, h: height / H },
        cx: (det.box.xmin + det.box.xmax) / 2 / W,
        cy: (det.box.ymin + det.box.ymax) / 2 / H,
        vector,
      });
    } catch {
      continue;
    }
  }
  return { division, parts };
}
