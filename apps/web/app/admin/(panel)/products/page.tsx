import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { buttonVariants, Card } from "@ecom/ui";
import { fetchProductList } from "@/lib/commerce";
import { AdminHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { products } = await fetchProductList({ limit: 50 });

  return (
    <>
      <AdminHeader
        title="Products"
        description="Create products here. Edit details/inventory in Medusa admin (:9000/app)."
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
              <Card key={p.id} className="overflow-hidden">
                <Link href={`/products/${p.handle}`} target="_blank">
                  <div className="relative aspect-[3/4] bg-muted">
                    <Image src={p.thumbnail} alt={p.title} fill sizes="200px" className="object-cover" />
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
