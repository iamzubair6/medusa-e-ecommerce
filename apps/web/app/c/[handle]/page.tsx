import { redirect } from "next/navigation";

// Legacy /c/{handle} routes now live under /collections/{handle}. Redirect, keeping query.
type Params = Promise<{ handle: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function LegacyCategoryRedirect({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { handle } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
  }
  const q = qs.toString();
  redirect(`/collections/${handle}${q ? `?${q}` : ""}`);
}
