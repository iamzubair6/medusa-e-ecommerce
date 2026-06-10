import { getSiteSetting } from "@ecom/cms";
import { ExternalLink } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { PaymentMethodsEditor } from "@/components/admin/payment-methods-editor";
import { parseCheckoutConfig } from "@/lib/checkout-config";
import { listPaymentProviders } from "@/lib/medusa-admin";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [raw, providers] = await Promise.all([
    getSiteSetting("checkout").catch(() => null),
    listPaymentProviders(),
  ]);

  return (
    <>
      <AdminHeader
        title="Payments"
        description="Which payment methods customers see at checkout, and how they're labelled."
        action={
          <a
            href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? ""}/app/settings`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Medusa providers
          </a>
        }
      />
      <div className="p-8">
        <PaymentMethodsEditor config={parseCheckoutConfig(raw)} providers={providers} />
      </div>
    </>
  );
}
