import { getSiteSetting } from "@ecom/cms";
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
      <div className="p-8">
        <ShopTheLookEditor initial={parseShopTheLook(raw)} products={products} />
      </div>
    </>
  );
}
