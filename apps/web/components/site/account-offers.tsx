import { TicketPercent, Sparkles } from "lucide-react";
import { getCartIncentives } from "@/lib/active-promos";
import { getPhoneReward, codeForPhone } from "@/lib/phone-reward";
import { OfferCode } from "./offer-code";

/**
 * "My offers" (#140) — server-rendered section on the account page: the
 * member's personal one-time code (when the phone reward is on and they have
 * a verified phone) plus every publicly listed code.
 */
export async function AccountOffers({ phone }: { phone: string | null }) {
  const [{ suggestions }, reward] = await Promise.all([getCartIncentives(), getPhoneReward()]);
  const personal =
    reward.enabled && phone
      ? {
          code: codeForPhone(phone),
          display: reward.kind === "percentage" ? `${reward.value}% off` : `৳${reward.value} off`,
        }
      : null;

  if (!personal && suggestions.length === 0) return null;

  return (
    <section aria-label="My offers" className="mt-12">
      <h2 className="font-display text-lg font-semibold tracking-tight">My offers</h2>
      <div className="mt-4 flex flex-col gap-3">
        {personal && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/5 p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold">{personal.display} — just for you</p>
                <p className="text-xs text-muted-foreground">One-time use · yours alone, tied to your number</p>
              </div>
            </div>
            <OfferCode code={personal.code} />
          </div>
        )}
        {suggestions.map((s) => (
          <div key={s.code} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4">
            <div className="flex items-center gap-3">
              <TicketPercent className="h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold">{s.display}</p>
                <p className="text-xs text-muted-foreground">
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
      </div>
    </section>
  );
}
