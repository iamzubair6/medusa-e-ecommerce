import "server-only";

/**
 * Pluggable OTP sender. MOCKED for now — see docs/PRODUCTION_DECISIONS.md (SMS
 * gateway). When no real provider is configured we run in "mock mode": the code
 * is NOT sent by SMS and is returned to the client so the demo is testable.
 *
 * To go live: set SMS_PROVIDER + credentials and implement the real send below.
 */
export const otpMockMode = (): boolean => !process.env.SMS_PROVIDER;

export async function sendOtp(phone: string, code: string): Promise<void> {
  if (otpMockMode()) {
    // eslint-disable-next-line no-console
    console.log(`[OTP mock] ${phone} -> ${code}`);
    return;
  }
  // Example wiring point for a real gateway (Twilio / SSL Wireless / etc.):
  // await fetch(provider.url, { method: "POST", headers, body: ... });
  throw new Error("SMS_PROVIDER set but no sender implemented");
}
