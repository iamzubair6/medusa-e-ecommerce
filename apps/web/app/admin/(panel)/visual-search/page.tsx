import { AdminHeader } from "@/components/admin/page-header";
import { VisualSearchClient } from "@/components/admin/visual-search-client";

export const dynamic = "force-dynamic";

export default function VisualSearchPage() {
  return (
    <>
      <AdminHeader title="Visual Search" description="Build the image index for 'Shop Similar'." />
      <div className="p-8">
        <VisualSearchClient />
      </div>
    </>
  );
}
