import { listCategoriesFull, listCollectionsFull } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, collections] = await Promise.all([listCategoriesFull(), listCollectionsFull()]);

  return (
    <>
      <AdminHeader title="Categories & Collections" description="Organise the catalogue — these power the storefront nav and listing pages." />
      <div className="p-8">
        <TaxonomyManager categories={categories} collections={collections} />
      </div>
    </>
  );
}
