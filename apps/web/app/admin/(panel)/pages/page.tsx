import Link from "next/link";
import { prisma } from "@ecom/cms";
import { Badge, Card, CardContent } from "@ecom/ui";
import { AdminHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function PagesList() {
  const pages = await prisma.pageLayout.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { sections: true } } },
  });

  return (
    <>
      <AdminHeader title="Pages" description="Compose storefront pages from content blocks." />
      <div className="flex flex-col gap-3 p-8">
        {pages.map((page) => (
          <Link key={page.id} href={`/admin/pages/${page.id}`}>
            <Card className="transition-colors hover:border-gold">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{page.title}</span>
                    <Badge variant={page.status === "PUBLISHED" ? "gold" : "muted"}>
                      {page.status.toLowerCase()}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">/{page.slug === "home" ? "" : page.slug}</span>
                </div>
                <span className="text-sm text-muted-foreground">{page._count.sections} sections</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {pages.length === 0 && <p className="text-sm text-muted-foreground">No pages yet.</p>}
      </div>
    </>
  );
}
