import { listCampaigns, campaignPayloadSchema } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { CampaignManager, type AdminCampaign } from "@/components/admin/campaign-manager";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const rows = await listCampaigns();
  const campaigns: AdminCampaign[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    payload: campaignPayloadSchema.parse(c.payload ?? {}),
  }));

  return (
    <>
      <AdminHeader title="Campaigns" description="Schedule promotional runs (codes, banners)." />
      <div className="p-8">
        <CampaignManager campaigns={campaigns} />
      </div>
    </>
  );
}
