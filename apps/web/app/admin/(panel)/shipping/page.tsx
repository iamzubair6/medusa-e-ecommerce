import { getSiteSetting } from "@ecom/cms";
import { ExternalLink } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { ShippingMethodsEditor } from "@/components/admin/shipping-methods-editor";
import { parseCheckoutConfig } from "@/lib/checkout-config";
import { listShippingRates, listShippingZones } from "@/lib/medusa-admin";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [raw, rates, zones] = await Promise.all([
    getSiteSetting("checkout").catch(() => null),
    listShippingRates(),
    listShippingZones(),
  ]);

  return (
    <>
      <AdminHeader
        title="Shipping"
        description="Delivery zones, options and rates (live Medusa data) plus per-option checkout notes & visibility."
        action={
          <a
            href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? ""}/app/settings/locations`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Open in Medusa
          </a>
        }
      />
      <div className="p-8">
        <ShippingMethodsEditor zones={zones} rates={rates} config={parseCheckoutConfig(raw)} />
      </div>
    </>
  );
}
