import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * SMS relay → MiMSMS. Exists because MiMSMS requires STATIC caller IPs:
 * Render gives this service fixed outbound IPs (whitelist them in the MiMSMS
 * panel), while Vercel and local dev machines have dynamic ones — so the web
 * app sends SMS through here instead of calling MiMSMS directly.
 *
 * Auth: shared secret header (x-relay-secret === SMS_RELAY_SECRET).
 * Env (this service): MIMSMS_API_KEY, MIMSMS_USERNAME, MIMSMS_SENDER_ID,
 * SMS_RELAY_SECRET.
 */

interface RelayBody {
  transactionType?: "T" | "P";
  mobileNumber?: string;
  message?: string;
}

const MAX_MESSAGE = 500;
const MAX_NUMBERS = 1000;

/**
 * Egress-IP probe: reports which public IP THIS service's outbound requests
 * use right now. Exists because MiMSMS only whitelists individual IPs — call
 * this repeatedly to learn the concrete addresses to whitelist. Leaks nothing
 * private (the IP is visible to every server we call anyway).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // ?check=balance (secret-gated): proves the MiMSMS whitelist end-to-end
  // without spending an SMS.
  if (req.query.check === "balance") {
    const secret = process.env.SMS_RELAY_SECRET;
    if (!secret || req.headers["x-relay-secret"] !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const apiKey = process.env.MIMSMS_API_KEY;
    const userName = process.env.MIMSMS_USERNAME;
    if (!apiKey || !userName) {
      res.status(503).json({ error: "SMS provider is not configured on the relay." });
      return;
    }
    try {
      const upstream = await fetch("https://api.mimsms.com/api/V2/BalanceCheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, userName }),
        signal: AbortSignal.timeout(15000),
      });
      res.status(upstream.ok ? 200 : 502).json(await upstream.json().catch(() => ({})));
    } catch {
      res.status(502).json({ error: "Could not reach the SMS gateway." });
    }
    return;
  }

  try {
    const r = await fetch("https://api.ipify.org", { signal: AbortSignal.timeout(10000) });
    res.status(200).json({ egressIp: (await r.text()).trim() });
  } catch {
    res.status(502).json({ error: "Could not determine egress IP." });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const secret = process.env.SMS_RELAY_SECRET;
  if (!secret || req.headers["x-relay-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apiKey = process.env.MIMSMS_API_KEY;
  const userName = process.env.MIMSMS_USERNAME;
  const senderName = process.env.MIMSMS_SENDER_ID;
  if (!apiKey || !userName || !senderName) {
    res.status(503).json({ error: "SMS provider is not configured on the relay." });
    return;
  }

  const body = (req.body ?? {}) as RelayBody;
  const transactionType = body.transactionType === "P" ? "P" : "T";
  const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const numberCount = mobileNumber.split(",").filter(Boolean).length;

  if (!mobileNumber || !message) {
    res.status(422).json({ error: "mobileNumber and message are required." });
    return;
  }
  if (message.length > MAX_MESSAGE || numberCount > MAX_NUMBERS) {
    res.status(422).json({ error: "Message or recipient list is too large." });
    return;
  }
  // BD-only guard: every number must be 880 + 10 digits.
  if (!mobileNumber.split(",").every((n) => /^880\d{10}$/.test(n.trim()))) {
    res.status(422).json({ error: "All numbers must be Bangladeshi (880XXXXXXXXXX)." });
    return;
  }

  try {
    const upstream = await fetch("https://api.mimsms.com/api/V2/SMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, userName, senderName, transactionType, mobileNumber, message }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    res.status(upstream.ok ? 200 : 502).json(data);
  } catch {
    res.status(502).json({ error: "Could not reach the SMS gateway." });
  }
}
