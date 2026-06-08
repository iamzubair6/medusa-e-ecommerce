import { Card } from "@ecom/ui";
import { Globe, Receipt, Users, ExternalLink, CreditCard } from "lucide-react";
import { getSettingsOverview, listShippingRates } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { ShippingEditor } from "@/components/admin/shipping-editor";
import { ReasonsEditor, SalesChannelsEditor } from "@/components/admin/settings-editors";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, rates] = await Promise.all([getSettingsOverview(), listShippingRates()]);

  return (
    <>
      <AdminHeader
        title="Settings"
        description="Store configuration. Day-to-day rates are editable here; deeper infra lives in Medusa admin."
        action={
          <a
            href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? ""}/app`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Open Medusa admin
          </a>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-2">
        <ShippingEditor rates={rates} />

        <Viewer icon={CreditCard} title="Payment methods">
          <Row left="Cash on Delivery" right="Live" />
          <p className="pt-1 text-xs text-muted-foreground">
            Online payment (card · bKash · Nagad) is planned — see <code>docs/PAYMENTS.md</code>. New
            payment providers are enabled per-region in Medusa admin.
          </p>
        </Viewer>

        <Viewer icon={Globe} title="Regions">
          {settings.regions.map((r) => (
            <Row key={r.id} left={r.name} right={`${r.currency} · ${r.countries.join(", ") || "—"}`} />
          ))}
        </Viewer>

        <Viewer icon={Receipt} title="Tax regions">
          {settings.taxRegions.length ? (
            settings.taxRegions.map((t) => <Row key={t.id} left={t.country} right="System tax" />)
          ) : (
            <Empty>No tax regions.</Empty>
          )}
        </Viewer>

        <SalesChannelsEditor channels={settings.salesChannels} />

        <Viewer icon={Users} title="Admin users">
          {settings.users.map((u) => (
            <Row key={u.id} left={u.name} right={u.email} />
          ))}
        </Viewer>

        <ReasonsEditor returnReasons={settings.returnReasons} refundReasons={settings.refundReasons} />
      </div>
    </>
  );
}

function Viewer({ icon: Icon, title, children }: { icon: typeof Globe; title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {children}
    </Card>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="font-medium">{left}</span>
      <span className="text-muted-foreground">{right}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}
