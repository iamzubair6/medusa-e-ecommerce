import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants, Card, Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = { title: "Order Confirmed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; email?: string; total?: string; method?: string }>;
}) {
  const { order, email, total, method } = await searchParams;
  const payLabel = method === "card" ? "Card / Online" : "Cash on Delivery";

  return (
    <main>
      <SiteNavbar />
      <Container className="flex min-h-[60vh] items-center justify-center py-16">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-gold" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Thank you for your order</h1>
          {order ? (
            <p className="mt-2 text-muted-foreground">
              Order <span className="font-semibold text-foreground">#{order}</span> is confirmed.
            </p>
          ) : (
            <p className="mt-2 text-muted-foreground">Your order is confirmed.</p>
          )}
          {(email || total) && (
            <div className="mt-6 flex flex-col gap-2 rounded-md bg-muted/50 p-4 text-left text-sm">
              {email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmation sent to</span>
                  <span className="font-medium">{email}</span>
                </div>
              )}
              {total && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{total}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">{payLabel}</span>
              </div>
            </div>
          )}
          <Link href="/products" className={`mt-8 ${buttonVariants({ variant: "solid" })}`}>
            Continue shopping
          </Link>
        </Card>
      </Container>
      <Footer />
    </main>
  );
}
