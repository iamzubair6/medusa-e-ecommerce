import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { SectionManager, type AdminSection } from "@/components/admin/section-manager";

export const dynamic = "force-dynamic";

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.pageLayout.findUnique({
    where: { id },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!page) notFound();

  const sections: AdminSection[] = page.sections.map((s) => ({
    id: s.id,
    type: s.type,
    position: s.position,
    config: s.config,
  }));

  return (
    <>
      <AdminHeader
        title={page.title}
        description="Reorder blocks and edit their content. Changes publish to the live store on save."
        action={
          <Link
            href="/admin/pages"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All pages
          </Link>
        }
      />
      <div className="p-8">
        <SectionManager sections={sections} />
      </div>
    </>
  );
}
