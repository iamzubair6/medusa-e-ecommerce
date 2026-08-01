import { redirect } from "next/navigation";
import { getPosSession } from "@/lib/pos-auth";
import { OrdersLookup } from "@/components/pos/orders-lookup";

export const dynamic = "force-dynamic";

/** Receipt-number lookup for reprints; ADMIN can process returns from here. */
export default async function PosOrdersPage() {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  return <OrdersLookup isAdmin={session.role === "ADMIN"} />;
}
