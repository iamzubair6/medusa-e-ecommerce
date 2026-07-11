import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { ProductImport } from "@/components/admin/product-import";

export const dynamic = "force-dynamic";

export default function ImportProductsPage() {
  return (
    <>
      <AdminHeader
        title="Import Products"
        description="Bulk-create products from an Excel file — download the template, fill one row per product, upload, review, import."
        action={
          <Link href="/admin/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All products
          </Link>
        }
      />
      <div className="p-8">
        <ProductImport />
      </div>
    </>
  );
}
