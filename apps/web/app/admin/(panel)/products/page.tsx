import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { Badge, buttonVariants, Card } from "@ecom/ui";
import { listAdminProducts } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await listAdminProducts(100);

  return (
    <>
      <AdminHeader
        title="Products"
        description="Create, edit, publish & delete — all here."
        action={
          <Link href="/admin/products/new" className={buttonVariants({ variant: "gold" })}>
            <Plus className="h-4 w-4" /> New Product
          </Link>
        }
      />
      <div className="p-8">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet. Click “New Product”.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Card key={p.id} className="group relative overflow-hidden">
                <Link href={`/admin/products/${p.id}/edit`} className="block">
                  <div className="relative aspect-[3/4] bg-muted">
                    {p.thumbnail && <Image src={p.thumbnail} alt={p.title} fill sizes="200px" className="object-cover" />}
                    {p.status !== "published" && (
                      <Badge variant="muted" className="absolute left-2 top-2 capitalize">{p.status}</Badge>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/40 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-sm bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                    <p className="text-sm font-bold">{p.price}</p>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
