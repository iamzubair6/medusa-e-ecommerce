import "server-only";

/**
 * Pluggable OTP sender.
 *
 * Real provider: MiMSMS (https://www.mimsms.com — docs: api.mimsms.com V2).
 * Enable with env:
 *   SMS_PROVIDER=mimsms
 *   MIMSMS_API_KEY=...        (panel → Utility → Developer, must be ACTIVATED)
 *   MIMSMS_USERNAME=...       (your MiMSMS panel login email)
 *   MIMSMS_SENDER_ID=...      (panel → Utility → Sender ID — exact value)
 * The panel also requires the calling server's IP + domain to be whitelisted
 * (Utility → Developer), or every request is rejected as unauthorized.
 *
 * Without SMS_PROVIDER we run in mock mode: nothing is sent and the demo code
 * is surfaced by the caller (dev / OTP_DEMO_CODES only).
 */
export const otpMockMode = (): boolean => !process.env.SMS_PROVIDER;

/** "+8801…", "01…", "008801…" → "8801…" (MiMSMS expects country-coded digits). */
export function toBdMsisdn(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("01")) digits = `88${digits}`;
  return digits;
}

interface MimsmsResponse {
  statusCode?: string | number;
  status?: string;
  responseResult?: string;
  trxnId?: string;
  message?: string;
}

async function sendViaMimsms(phone: string, message: string): Promise<void> {
  const apiKey = process.env.MIMSMS_API_KEY;
  const userName = process.env.MIMSMS_USERNAME;
  const senderName = process.env.MIMSMS_SENDER_ID;
  if (!apiKey || !userName || !senderName) {
    throw new Error("SMS is not fully configured (MIMSMS_API_KEY / MIMSMS_USERNAME / MIMSMS_SENDER_ID).");
  }

  const res = await fetch("https://api.mimsms.com/api/V2/SMS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      userName,
      senderName,
      transactionType: "T", // transactional — OTPs deliver regardless of DND
      mobileNumber: toBdMsisdn(phone),
      message,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = (await res.json().catch(() => ({}))) as MimsmsResponse;
  const ok =
    res.ok &&
    (String(data.statusCode ?? "") === "200" ||
      (data.status ?? "").toLowerCase() === "success" ||
      (data.responseResult ?? "").toLowerCase().includes("success"));
  if (!ok) {
    throw new Error(
      `SMS gateway refused the send${data.responseResult || data.message ? ` — ${data.responseResult ?? data.message}` : ""}.`,
    );
  }
}

export async function sendOtp(phone: string, code: string): Promise<void> {
  if (otpMockMode()) {
    // eslint-disable-next-line no-console
    console.log(`[OTP mock] ${phone} -> ${code}`);
    return;
  }
  if (process.env.SMS_PROVIDER === "mimsms") {
    await sendViaMimsms(phone, `Your Maison verification code is ${code}. It expires in 5 minutes.`);
    return;
  }
  throw new Error(`SMS_PROVIDER "${process.env.SMS_PROVIDER}" has no sender implemented`);
}

/**
 * One-off transactional SMS (order confirmations etc.). Never throws —
 * returns false when SMS is unconfigured or the gateway refuses.
 */
export async function sendTransactionalSms(phone: string, message: string): Promise<boolean> {
  if (otpMockMode() || process.env.SMS_PROVIDER !== "mimsms" || !phone.trim()) return false;
  try {
    await sendViaMimsms(phone, message);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk PROMOTIONAL SMS (MiMSMS type P — subject to DND, supports Bengali).
 * Numbers are normalized + deduped; MiMSMS accepts up to 1000 per request.
 * Returns per-batch results so callers can report exact reach.
 */
export async function sendPromotionalSms(
  phones: string[],
  message: string,
): Promise<{ sent: number; failed: number; error?: string }> {
  const apiKey = process.env.MIMSMS_API_KEY;
  const userName = process.env.MIMSMS_USERNAME;
  const senderName = process.env.MIMSMS_SENDER_ID;
  if (otpMockMode() || process.env.SMS_PROVIDER !== "mimsms" || !apiKey || !userName || !senderName) {
    return { sent: 0, failed: phones.length, error: "SMS is not configured." };
  }

  // BD mobiles only: 880 + 10 digits — anything else is a billed dead send.
  const numbers = [...new Set(phones.map(toBdMsisdn).filter((n) => n.length === 13 && n.startsWith("880")))];
  if (numbers.length === 0) return { sent: 0, failed: 0, error: "No valid phone numbers." };

  let sent = 0;
  let failed = 0;
  let error: string | undefined;
  for (let i = 0; i < numbers.length; i += 1000) {
    const batch = numbers.slice(i, i + 1000);
    try {
      const res = await fetch("https://api.mimsms.com/api/V2/SMS", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          userName,
          senderName,
          transactionType: "P",
          mobileNumber: batch.join(","),
          message,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = (await res.json().catch(() => ({}))) as MimsmsResponse;
      const ok =
        res.ok &&
        (String(data.statusCode ?? "") === "200" || (data.status ?? "").toLowerCase() === "success");
      if (ok) sent += batch.length;
      else {
        failed += batch.length;
        error = data.responseResult ?? data.message ?? "Gateway refused the batch.";
      }
    } catch {
      failed += batch.length;
      error = "Could not reach the SMS gateway.";
    }
  }
  return { sent, failed, error };
}
