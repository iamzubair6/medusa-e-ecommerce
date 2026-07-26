import type { Metadata } from "next";
import Link from "next/link";
import { TicketPercent, Truck } from "lucide-react";
import { getCartIncentives } from "@/lib/active-promos";
import { OfferCode } from "@/components/site/offer-code";

export const metadata: Metadata = {
  title: "Offers & Codes",
  description: "Current promo codes and delivery offers.",
};

export const revalidate = 300;

/** Public offers page (#140): the ONLY guest-facing place codes are listed —
 *  and only codes the owner flagged public (plus the live campaign's code). */
export default async function OffersPage() {
  const { suggestions, freeOver } = await getCartIncentives();

  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Right now</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        Offers &amp; codes
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Enter a code in your bag or at checkout. Signed-in members see their personal offers in{" "}
        <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
          My account
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {freeOver != null && (
          <div className="flex items-center gap-4 rounded-md border border-border bg-card p-5">
            <Truck className="h-6 w-6 shrink-0 text-gold" />
            <div>
              <p className="font-display font-bold">Free delivery over ৳{freeOver.toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground">Applied automatically at checkout — no code needed.</p>
            </div>
          </div>
        )}

        {suggestions.map((s) => (
          <div key={s.code} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <TicketPercent className="h-6 w-6 shrink-0 text-gold" />
              <div>
                <p className="font-display font-bold">{s.display}</p>
                <p className="text-sm text-muted-foreground">
                  {s.fromCampaign ? "Campaign offer" : "Limited offer"}
                  {s.endsAt
                    ? ` · ends ${new Date(s.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                    : ""}
                </p>
              </div>
            </div>
            <OfferCode code={s.code} />
          </div>
        ))}

        {suggestions.length === 0 && freeOver == null && (
          <div className="rounded-md border border-border bg-card p-10 text-center">
            <p className="font-display font-bold">No public offers right now</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New drops come with new codes — check back soon, or{" "}
              <Link href="/account" className="underline underline-offset-2">sign in</Link> to see
              personal offers.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
