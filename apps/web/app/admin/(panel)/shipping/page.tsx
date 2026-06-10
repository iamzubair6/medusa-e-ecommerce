import { getSiteSetting } from "@ecom/cms";
import { ExternalLink } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { ShippingMethodsEditor } from "@/components/admin/shipping-methods-editor";
import { parseCheckoutConfig } from "@/lib/checkout-config";
import { listShippingRates } from "@/lib/medusa-admin";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [raw, rates] = await Promise.all([
    getSiteSetting("checkout").catch(() => null),
    listShippingRates(),
  ]);

  return (
    <>
      <AdminHeader
        title="Shipping"
        description="Delivery rates (live Medusa amounts) plus per-option checkout notes & visibility."
        action={
          <a
            href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? ""}/app/settings/locations`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Zones in Medusa
          </a>
        }
      />
      <div className="p-8">
        <ShippingMethodsEditor rates={rates} config={parseCheckoutConfig(raw)} />
      </div>
    </>
  );
}
