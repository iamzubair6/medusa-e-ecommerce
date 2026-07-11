"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Badge, Button, Card, cn } from "@ecom/ui";

/** Live courier panel for an order that has a Steadfast consignment. */

const statusSchema = z.object({
  status: z.string(),
  rawStatus: z.string(),
});
type CourierStatus = z.infer<typeof statusSchema>;

async function fetchStatus(orderId: string): Promise<CourierStatus> {
  const res = await fetch(`/api/admin/orders/${orderId}/steadfast`);
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Could not reach Steadfast.");
  }
  return statusSchema.parse(await res.json());
}

const badgeVariant = (status: string): "gold" | "accent" | "outline" =>
  status === "Delivered" ? "gold" : status === "Returned/Cancelled" ? "accent" : "outline";

export function SteadfastCard({
  orderId,
  consignmentId,
  trackingCode,
  trackingUrl,
}: {
  orderId: string;
  consignmentId: string;
  trackingCode: string;
  trackingUrl: string;
}) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["steadfast-status", orderId],
    queryFn: () => fetchStatus(orderId),
    staleTime: 30_000,
  });

  return (
    <Card className="p-5 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Courier: Steadfast
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh courier status"
          className="h-7 px-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin motion-reduce:animate-none")} />
          Refresh
        </Button>
      </div>

      <dl className="flex flex-col gap-2">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Consignment</dt>
          <dd className="font-medium">{consignmentId}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tracking</dt>
          <dd>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
            >
              {trackingCode} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Live status</dt>
          <dd>
            {isPending ? (
              <span className="inline-block h-5 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" aria-label="Loading status" />
            ) : error ? (
              <span className="text-xs text-destructive">{error.message}</span>
            ) : data ? (
              <span className="inline-flex items-center gap-2">
                <Badge variant={badgeVariant(data.status)}>{data.status}</Badge>
                <span className="text-xs text-muted-foreground">({data.rawStatus})</span>
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
