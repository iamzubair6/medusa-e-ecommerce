import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@ecom/ui";
import { getProductForEdit, listCategories } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { ProductCreator } from "@/components/admin/product-creator";
import { ProductActions } from "@/components/admin/product-actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductForEdit(id), listCategories()]);
  if (!product) notFound();

  return (
    <>
      <AdminHeader
        title={product.title}
        description="Edit details, colours, prices, sizes & images."
        action={
          <div className="flex items-center gap-4">
            <Badge variant={product.status === "published" ? "gold" : "muted"}>{product.status}</Badge>
            <ProductActions id={product.id} status={product.status} />
            <Link href="/admin/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> All
            </Link>
          </div>
        }
      />
      <div className="p-8">
        <ProductCreator
          categories={categories}
          initial={{
            id: product.id,
            title: product.title,
            description: product.description,
            offer: product.offer,
            categoryIds: product.categoryIds,
            tags: product.tags,
            type: product.type,
            // Merchandising metadata — omitting these blanked the fields on
            // reopen, and the next save then wiped them in Medusa (#89).
            division: product.division,
            occasion: product.occasion,
            style: product.style,
            trend: product.trend,
            material: product.material,
            care: product.care,
            sizeGuide: product.sizeGuide,
            colors: product.colors,
          }}
        />
      </div>
    </>
  );
}
