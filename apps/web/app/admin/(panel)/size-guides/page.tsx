import { getSiteSetting } from "@ecom/cms";
import { listCategories } from "@/lib/commerce";
import { parseSizeGuides } from "@/lib/size-guides";
import { AdminHeader } from "@/components/admin/page-header";
import { SizeGuidesEditor } from "@/components/admin/size-guides-editor";

export const dynamic = "force-dynamic";

export default async function AdminSizeGuidesPage() {
  const [raw, categories] = await Promise.all([
    getSiteSetting("sizeGuides").catch(() => null),
    listCategories().catch(() => []),
  ]);
  return (
    <>
      <AdminHeader
        title="Size Guides"
        description="The size chart shoppers see from 'View Size Guide' on a product — one guide per garment type, matched by category."
      />
      <div className="p-8">
        <SizeGuidesEditor
          initial={parseSizeGuides(raw)}
          categoryHandles={categories.map((c) => c.handle)}
        />
      </div>
    </>
  );
}
