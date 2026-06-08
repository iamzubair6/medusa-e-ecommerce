import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { findCustomerEmailByPhone } from "./medusa-admin";

const PHONE_SECRET = process.env.ADMIN_SESSION_SECRET || "dev-phone-secret";
const phoneDigits = (p: string) => p.replace(/\D/g, "");
const phoneEmail = (p: string) => `p${phoneDigits(p)}@phone.maison.local`;
// Strong, reproducible password derived from the phone (never shown to the user).
const phonePassword = (p: string) =>
  crypto.createHmac("sha256", PHONE_SECRET).update(`pw:${phoneDigits(p)}`).digest("base64url").slice(0, 24);

/**
 * Storefront customer authentication via Medusa's emailpass auth. The JWT is kept
 * in an httpOnly cookie; all customer calls go through here (server-only).
 */

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const COOKIE = "maison_customer";

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
export interface CustomerOrder {
  id: string;
  displayId: number;
  total: string;
  createdAt: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

function money(amount: number | undefined, currency?: string): string {
  const cur = (currency ?? "bdt").toUpperCase();
  if (cur === "BDT") return `৳${Math.round(amount ?? 0).toLocaleString("en-US")}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount ?? 0);
}

async function storeFetch(path: string, token: string, init?: RequestInit) {
  return fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE as string,
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Get a JWT from the emailpass provider. Returns null on bad credentials. */
async function authToken(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BACKEND}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return data.token ?? null;
}

async function setToken(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearCustomerSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // 1) create an auth identity → registration token
  const reg = await fetch(`${BACKEND}/auth/customer/emailpass/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, password: input.password }),
    cache: "no-store",
  });
  if (!reg.ok) {
    const d = (await reg.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: d.message?.includes("already") ? "An account with this email already exists." : d.message ?? "Could not register." };
  }
  const { token: regToken } = (await reg.json()) as { token: string };

  // 2) create the customer record with that token
  const created = await storeFetch("/store/customers", regToken, {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      ...(input.phone ? { phone: input.phone } : {}),
    }),
  });
  if (!created.ok) {
    const d = (await created.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: d.message ?? "Could not create your account." };
  }

  // 3) log in for a session token
  const token = await authToken(input.email, input.password);
  if (!token) return { ok: false, error: "Account created — please log in." };
  await setToken(token);
  return { ok: true };
}

export async function loginCustomer(email: string, password: string): Promise<boolean> {
  const token = await authToken(email, password);
  if (!token) return false;
  await setToken(token);
  return true;
}

/**
 * Passwordless phone login: derive a stable password from the phone, then
 * log in (returning user) or auto-create the customer (new user) and log in.
 */
export async function loginOrCreateByPhone(phone: string): Promise<{ ok: boolean; error?: string }> {
  const email = phoneEmail(phone);
  const password = phonePassword(phone);

  let token = await authToken(email, password);
  if (!token) {
    const reg = await fetch(`${BACKEND}/auth/customer/emailpass/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (reg.ok) {
      const { token: regToken } = (await reg.json()) as { token: string };
      await storeFetch("/store/customers", regToken, {
        method: "POST",
        body: JSON.stringify({ email, phone, first_name: "", last_name: "" }),
      }).catch(() => undefined);
    }
    token = await authToken(email, password);
  }
  if (!token) return { ok: false, error: "Could not sign you in." };
  await setToken(token);
  return { ok: true };
}

/** Login by email OR phone + password. Phone is resolved to its account email. */
export async function loginByIdentifier(
  identifier: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  let email = identifier.trim();
  if (!email.includes("@")) {
    const found = await findCustomerEmailByPhone(email);
    if (!found) return { ok: false, error: "No account found for that phone number." };
    email = found;
  }
  const token = await authToken(email, password);
  if (!token) return { ok: false, error: "Incorrect email/phone or password." };
  await setToken(token);
  return { ok: true };
}

export async function getCustomer(): Promise<Customer | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await storeFetch("/store/customers/me?fields=id,email,first_name,last_name,phone", token);
  if (!res.ok) return null;
  const { customer: c } = (await res.json()) as {
    customer?: { id: string; email: string; first_name?: string; last_name?: string; phone?: string };
  };
  if (!c) return null;
  return { id: c.id, email: c.email, firstName: c.first_name ?? "", lastName: c.last_name ?? "", phone: c.phone ?? undefined };
}

export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  const token = await getToken();
  if (!token) return [];
  const fields = "id,display_id,total,currency_code,created_at,payment_status,fulfillment_status";
  const res = await storeFetch(`/store/orders?fields=${encodeURIComponent(fields)}&limit=50&order=-created_at`, token);
  if (!res.ok) return [];
  const { orders } = (await res.json()) as {
    orders?: { id: string; display_id: number; total: number; currency_code: string; created_at: string; payment_status: string; fulfillment_status: string }[];
  };
  return (orders ?? []).map((o) => ({
    id: o.id,
    displayId: o.display_id,
    total: money(o.total, o.currency_code),
    createdAt: o.created_at,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
  }));
}

/**
 * If a customer is signed in, attach the active cart to their account so the
 * resulting order shows up in their order history. Best-effort (guest = no-op).
 */
export async function transferCartToCustomer(cartId: string): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await storeFetch(`/store/carts/${cartId}/customer`, token, { method: "POST" });
  return res.ok;
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getToken()) !== null;
}

// --- Saved addresses --------------------------------------------------------

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  phone?: string;
  countryCode: string;
}
export interface AddressInput {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  phone?: string;
  countryCode?: string;
}

interface RawAddress {
  id: string;
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  country_code?: string;
}

const mapAddress = (a: RawAddress): Address => ({
  id: a.id,
  firstName: a.first_name ?? "",
  lastName: a.last_name ?? "",
  address1: a.address_1 ?? "",
  address2: a.address_2 ?? undefined,
  city: a.city ?? "",
  postalCode: a.postal_code ?? "",
  phone: a.phone ?? undefined,
  countryCode: (a.country_code ?? "bd").toUpperCase(),
});

const toBody = (input: AddressInput) => ({
  first_name: input.firstName,
  last_name: input.lastName,
  address_1: input.address1,
  address_2: input.address2 ?? "",
  city: input.city,
  postal_code: input.postalCode,
  phone: input.phone ?? "",
  country_code: (input.countryCode ?? "bd").toLowerCase(),
});

export async function listAddresses(): Promise<Address[]> {
  const token = await getToken();
  if (!token) return [];
  const res = await storeFetch("/store/customers/me/addresses", token);
  if (!res.ok) return [];
  const { addresses } = (await res.json()) as { addresses?: RawAddress[] };
  return (addresses ?? []).map(mapAddress);
}

export async function addAddress(input: AddressInput): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await storeFetch("/store/customers/me/addresses", token, { method: "POST", body: JSON.stringify(toBody(input)) });
  return res.ok;
}

export async function updateAddress(id: string, input: AddressInput): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await storeFetch(`/store/customers/me/addresses/${id}`, token, { method: "POST", body: JSON.stringify(toBody(input)) });
  return res.ok;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await storeFetch(`/store/customers/me/addresses/${id}`, token, { method: "DELETE" });
  return res.ok;
}

export async function updateCustomer(patch: { firstName?: string; lastName?: string; phone?: string }): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await storeFetch("/store/customers/me", token, {
    method: "POST",
    body: JSON.stringify({
      ...(patch.firstName !== undefined ? { first_name: patch.firstName } : {}),
      ...(patch.lastName !== undefined ? { last_name: patch.lastName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    }),
  });
  return res.ok;
}
