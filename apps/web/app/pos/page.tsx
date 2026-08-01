import { redirect } from "next/navigation";
import { getPosSession } from "@/lib/pos-auth";
import { PosCounter } from "@/components/pos/counter";

export const dynamic = "force-dynamic";

/** The counter. Middleware gates /pos; this re-check covers direct renders. */
export default async function PosPage() {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  return (
    <PosCounter
      cashier={{ name: session.name, email: session.email }}
      isAdmin={session.role === "ADMIN"}
    />
  );
}
