import type { Metadata } from "next";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { WishlistView } from "@/components/site/wishlist-view";

export const metadata: Metadata = { title: "Saved pieces" };

export const dynamic = "force-dynamic";

export default function WishlistPage() {
  return (
    <main>
      <SiteNavbar />
      <WishlistView />
      <Footer />
    </main>
  );
}
