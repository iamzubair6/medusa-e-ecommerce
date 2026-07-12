import "server-only";
import { z } from "zod";

/**
 * Steadfast Courier (Bangladesh) merchant API — parcel handover + delivery status.
 *
 * API verified against the official SteadFast-Courier-Laravel-Package source
 * (github.com/steadfast-it/SteadFast-Courier-Laravel-Package):
 *   base URL  https://portal.packzy.com/api/v1
 *   headers   Api-Key / Secret-Key / Content-Type: application/json
 *   POST /create_order            { invoice, recipient_name, recipient_phone,
 *                                   recipient_address, cod_amount, note? }
 *             → { status, message, consignment: { consignment_id, tracking_code, status … } }
 *   GET  /status_by_cid/{id}      → { status, delivery_status }
 *
 * Env: STEADFAST_API_KEY + STEADFAST_SECRET_KEY (portal → API); optional
 * STEADFAST_BASE_URL override. Without keys the integration simply stays hidden.
 */

const DEFAULT_BASE_URL = "https://portal.packzy.com/api/v1";

const baseUrl = (): string => process.env.STEADFAST_BASE_URL || DEFAULT_BASE_URL;

/**
 * TEST MODE — Steadfast has no sandbox, so STEADFAST_MOCK=true simulates it:
 * consignments are invented locally (id "MOCK-…", no API call, no real pickup)
 * and their status auto-progresses by age — Handed to courier (0–2 min) →
 * In transit (2–5 min) → Delivered — so the whole admin/customer flow can be
 * exercised safely. Flip the env off to book real deliveries.
 */
export function steadfastMockMode(): boolean {
  return process.env.STEADFAST_MOCK === "true";
}

export function steadfastConfigured(): boolean {
  return steadfastMockMode() || Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY);
}

const MOCK_PREFIX = "MOCK-";

export function isMockConsignment(consignmentId: string): boolean {
  return consignmentId.startsWith(MOCK_PREFIX);
}

/** Age-derived simulated status for a mock consignment id (MOCK-<created-ms in base36>). */
function mockStatusFor(consignmentId: string): string {
  const createdAt = parseInt(consignmentId.slice(MOCK_PREFIX.length), 36);
  const ageMinutes = Number.isFinite(createdAt) ? (Date.now() - createdAt) / 60_000 : 99;
  if (ageMinutes < 2) return "pending";
  if (ageMinutes < 5) return "in_review";
  return "delivered";
}

function authHeaders(): Record<string, string> {
  return {
    "Api-Key": process.env.STEADFAST_API_KEY ?? "",
    "Secret-Key": process.env.STEADFAST_SECRET_KEY ?? "",
    "Content-Type": "application/json",
  };
}

/** Public parcel-tracking page for a consignment's tracking code. */
export function steadfastTrackingUrl(trackingCode: string): string {
  return `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`;
}

/**
 * Steadfast delivery_status vocabulary → our customer-facing labels.
 * Raw values (per official docs): pending, delivered_approval_pending,
 * partial_delivered_approval_pending, cancelled_approval_pending,
 * unknown_approval_pending, delivered, partial_delivered, cancelled, hold,
 * in_review, unknown.
 */
export function mapSteadfastStatus(raw: string): string {
  switch (raw) {
    case "pending":
      return "Handed to courier";
    case "in_review":
    case "hold":
      return "In transit";
    case "delivered":
    case "delivered_approval_pending":
    case "partial_delivered":
    case "partial_delivered_approval_pending":
      return "Delivered";
    case "cancelled":
    case "cancelled_approval_pending":
      return "Returned/Cancelled";
    default:
      return "In transit"; // unknown / unknown_approval_pending — raw value shown alongside
  }
}

export interface SteadfastConsignment {
  consignmentId: string;
  trackingCode: string;
  /** Mapped, customer-facing label. */
  status: string;
  /** Steadfast's own status value. */
  rawStatus: string;
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const createResponseSchema = z.object({
  status: z.number(),
  message: z.string().nullish(),
  consignment: z
    .object({
      consignment_id: z.union([z.number(), z.string()]),
      tracking_code: z.string(),
      status: z.string().nullish(),
    })
    .nullish(),
  errors: z.record(z.string(), z.unknown()).nullish(),
});

const statusResponseSchema = z.object({
  status: z.number(),
  delivery_status: z.string().nullish(),
});

export interface CreateConsignmentInput {
  /** Branded order number, e.g. "MSN-00042" — also usable for status_by_invoice. */
  invoice: string;
  name: string;
  /** 11-digit BD mobile (01XXXXXXXXX). */
  phone: string;
  address: string;
  /** ৳ to collect on delivery — 0 for prepaid orders. */
  codAmount: number;
  note?: string;
}

/** Hand a parcel over to Steadfast: POST /create_order. */
export async function createConsignment(
  order: CreateConsignmentInput,
): Promise<Result<{ consignment: SteadfastConsignment }>> {
  if (steadfastMockMode()) {
    const id = `${MOCK_PREFIX}${Date.now().toString(36)}`;
    return {
      ok: true,
      consignment: {
        consignmentId: id,
        trackingCode: `TEST${Date.now().toString(36).toUpperCase()}`,
        status: mapSteadfastStatus("in_review"),
        rawStatus: "in_review",
      },
    };
  }
  if (!steadfastConfigured()) return { ok: false, error: "Steadfast is not configured." };
  try {
    const res = await fetch(`${baseUrl()}/create_order`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        invoice: order.invoice,
        recipient_name: order.name,
        recipient_phone: order.phone,
        recipient_address: order.address,
        cod_amount: Math.max(0, Math.round(order.codAmount)),
        ...(order.note ? { note: order.note } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const parsed = createResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) return { ok: false, error: "Unexpected response from Steadfast." };
    const { data } = parsed;
    if (data.status !== 200 || !data.consignment) {
      const detail =
        data.message ??
        (data.errors ? Object.keys(data.errors).map((k) => `invalid ${k}`).join(", ") : null);
      return { ok: false, error: detail ? `Steadfast refused the order: ${detail}` : "Steadfast refused the order." };
    }
    const rawStatus = data.consignment.status ?? "in_review";
    return {
      ok: true,
      consignment: {
        consignmentId: String(data.consignment.consignment_id),
        trackingCode: data.consignment.tracking_code,
        status: mapSteadfastStatus(rawStatus),
        rawStatus,
      },
    };
  } catch {
    return { ok: false, error: "Could not reach Steadfast. Try again." };
  }
}

/** Live delivery status: GET /status_by_cid/{consignmentId}. */
export async function getConsignmentStatus(
  consignmentId: string,
): Promise<Result<{ status: string; rawStatus: string }>> {
  if (isMockConsignment(consignmentId)) {
    const raw = mockStatusFor(consignmentId);
    return { ok: true, status: mapSteadfastStatus(raw), rawStatus: `${raw} (test mode)` };
  }
  if (!steadfastConfigured()) return { ok: false, error: "Steadfast is not configured." };
  try {
    const res = await fetch(`${baseUrl()}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const parsed = statusResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success || parsed.data.status !== 200 || !parsed.data.delivery_status) {
      return { ok: false, error: "Steadfast did not return a status for this consignment." };
    }
    return {
      ok: true,
      status: mapSteadfastStatus(parsed.data.delivery_status),
      rawStatus: parsed.data.delivery_status,
    };
  } catch {
    return { ok: false, error: "Could not reach Steadfast. Try again." };
  }
}
