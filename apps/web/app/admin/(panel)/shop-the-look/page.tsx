import { getSiteSetting } from "@ecom/cms";
import { Card } from "@ecom/ui";
import { AdminHeader } from "@/components/admin/page-header";
import { ShopTheLookEditor, type LookProductOption } from "@/components/admin/shop-the-look-editor";
import { parseShopTheLook } from "@/lib/shop-the-look";
import { fetchProductList } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export default async function AdminShopTheLookPage() {
  const [raw, list] = await Promise.all([
    getSiteSetting("shopTheLook").catch(() => null),
    fetchProductList({ limit: 100 }),
  ]);
  const products: LookProductOption[] = list.products.map((p) => ({
    handle: p.handle,
    title: p.title,
    image: p.thumbnail,
  }));

  return (
    <>
      <AdminHeader
        title="Shop the Look"
        description="Tag the pieces in a product's model photo — shoppers click a dot to jump to that item (top, bottom, shoes, accessories)."
      />
      <div className="flex flex-col gap-6 p-8">
        <Card className="max-w-3xl p-6">
          <h2 className="font-display text-lg font-bold">What this does</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            &ldquo;Shop the Look&rdquo; turns one outfit photo into a mini shopping page. Example:
            a model wears a top, shorts and sneakers you all sell — you upload that photo here,
            click on each piece, and pick which product it is. On the product page, shoppers then
            see numbered dots on the photo and can jump straight to every item in the outfit.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Pick the product whose page shows the look, and upload the outfit photo.</li>
            <li>Click a spot on the photo (e.g. the shoes) and choose the matching product.</li>
            <li>Repeat for each piece (up to 8), then save — the dots appear on that product&rsquo;s page.</li>
          </ol>
        </Card>
        <ShopTheLookEditor initial={parseShopTheLook(raw)} products={products} />
      </div>
    </>
  );
}
