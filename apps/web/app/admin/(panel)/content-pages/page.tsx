import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { ContentPagesEditor } from "@/components/admin/content-pages-editor";
import { parseContentPages } from "@/lib/content-pages";

export const dynamic = "force-dynamic";

export default async function AdminContentPagesPage() {
  const raw = await getSiteSetting("contentPages").catch(() => null);
  return (
    <>
      <AdminHeader
        title="Content pages"
        description="Footer, help and legal pages — add, edit, hide or link any static page without a deploy."
      />
      <div className="p-8">
        <ContentPagesEditor initial={parseContentPages(raw)} />
      </div>
    </>
  );
}
