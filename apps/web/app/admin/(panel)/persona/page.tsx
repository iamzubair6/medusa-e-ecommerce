import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { PersonaBuilder } from "@/components/admin/persona-builder";
import { parsePersona } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default async function AdminPersonaPage() {
  const raw = await getSiteSetting("persona").catch(() => null);
  const persona = parsePersona(raw);
  return (
    <>
      <AdminHeader title="Persona" description="Optional checkout questions that unlock an extra stacked discount when completed." />
      <div className="p-8">
        <PersonaBuilder initial={persona} />
      </div>
    </>
  );
}
