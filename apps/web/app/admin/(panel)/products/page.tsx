import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@ecom/ui";
import { listAdminProducts } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ProductsGrid } from "@/components/admin/products-grid";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { products, count } = await listAdminProducts(PAGE_SIZE, (page - 1) * PAGE_SIZE);

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
          <ProductsGrid
            products={products.map((p) => ({
              id: p.id,
              title: p.title,
              handle: p.handle,
              status: p.status,
              thumbnail: p.thumbnail,
              price: p.price,
            }))}
          />
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} basePath="/admin/products" />
      </div>
    </>
  );
}
