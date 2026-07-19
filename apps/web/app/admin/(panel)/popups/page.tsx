import { prisma, popupConfigSchema } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { PopupEditor, type AdminPopup } from "@/components/admin/editors/popup-editor";

export const dynamic = "force-dynamic";

export default async function PopupsPage() {
  const rows = await prisma.popup.findMany({ orderBy: { updatedAt: "desc" } });
  const popups: AdminPopup[] = rows.flatMap((row) => {
    const parsed = popupConfigSchema.safeParse(row.config);
    if (!parsed.success) return [];
    return [
      {
        id: row.id,
        name: row.name,
        active: row.active,
        trigger: row.trigger,
        config: parsed.data,
        startsAt: row.startsAt ? row.startsAt.toISOString() : null,
        endsAt: row.endsAt ? row.endsAt.toISOString() : null,
      },
    ];
  });

  return (
    <>
      <AdminHeader title="Popups" description="Promotional popups shown on the storefront." />
      <div className="flex flex-col gap-5 p-8">
        {popups.map((popup) => (
          <PopupEditor key={popup.id} popup={popup} />
        ))}
        {popups.length === 0 && <p className="text-sm text-muted-foreground">No popups configured.</p>}
      </div>
    </>
  );
}
