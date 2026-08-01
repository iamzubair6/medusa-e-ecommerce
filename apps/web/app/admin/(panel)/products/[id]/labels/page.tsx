import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { posProductById } from "@/lib/pos";
import { LabelSheet } from "@/components/admin/label-sheet";

export const dynamic = "force-dynamic";

/** Printable Code128 SKU labels — stick them on tags so the POS can scan. */
export default async function ProductLabelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await posProductById(id);
  if (!product) notFound();

  return (
    <>
      <div className="print:hidden">
        <AdminHeader
          title={`Barcode labels — ${product.title}`}
          description="Print, cut, and stick on the tags. The POS scans these SKUs straight into the cart."
          action={
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to product
            </Link>
          }
        />
      </div>
      <div className="p-8 print:p-0">
        <LabelSheet product={product} />
      </div>
    </>
  );
}
