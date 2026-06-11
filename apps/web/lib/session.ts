import type { AdminRole } from "@ecom/cms";

/**
 * Edge-safe signed admin session token. Used by BOTH the Next.js middleware
 * (edge runtime) and server components / route handlers (node runtime), so it
 * relies only on Web Crypto (`crypto.subtle`) — no Node-only APIs, no deps.
 *
 * Format: `base64url(JSON payload).base64url(HMAC-SHA256(payload))`.
 */
export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  /** Expiry, epoch seconds. */
  exp: number;
}

const encoder = new TextEncoder();

function toB64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(b64: string): string {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

function bytesToB64url(buf: ArrayBuffer): string {
  let bin = "";
  for (const byte of new Uint8Array(buf)) bin += String.fromCharCode(byte);
  return toB64url(bin);
}

function b64urlToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = fromB64url(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Sign a session payload into a cookie-safe token. */
export async function signSession(payload: AdminSession, secret: string): Promise<string> {
  const body = toB64url(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${bytesToB64url(sig)}`;
}

/** Verify a token and return its payload, or null if missing/tampered/expired. */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<AdminSession | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(fromB64url(body)) as AdminSession;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
