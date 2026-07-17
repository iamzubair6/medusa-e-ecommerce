import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Bust every Medusa-backed cache after an admin catalog mutation (products,
 * categories, prices). medusaFetch caches for 5 minutes against these tags —
 * calling this makes admin changes visible on the storefront immediately.
 */
export function revalidateCommerce(): void {
  revalidateTag("commerce:products");
  revalidateTag("commerce:catalog");
  revalidateTag("commerce:categories");
  revalidatePath("/", "layout");
}
