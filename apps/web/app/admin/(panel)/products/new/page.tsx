import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { ProductCreator } from "@/components/admin/product-creator";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <>
      <AdminHeader
        title="New Product"
        description="Add a product with colors, images, sizes, and an offer — no JSON required."
        action={
          <Link href="/admin/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All products
          </Link>
        }
      />
      <div className="p-8">
        <ProductCreator />
      </div>
    </>
  );
}
