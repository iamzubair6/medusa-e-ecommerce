import { Card } from "@ecom/ui";

interface Bar {
  label: string;
  value: number;
  display: string;
}

/** Dependency-free responsive bar chart (CSS heights, hover tooltip via title). */
export function BarChart({
  title,
  total,
  bars,
  accent = "bg-accent",
}: {
  title: string;
  total: string;
  bars: Bar[];
  accent?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <span className="font-display text-xl font-bold">{total}</span>
      </div>
      <div className="flex h-40 items-end gap-1.5">
        {bars.map((b, i) => (
          <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="relative flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-sm ${accent} opacity-80 transition-opacity group-hover:opacity-100`}
                style={{ height: `${Math.max(2, (b.value / max) * 100)}%` }}
                title={`${b.label}: ${b.display}`}
              />
            </div>
            <span className="hidden text-[0.6rem] text-muted-foreground sm:block">
              {i % 2 === 0 ? b.label.split(" ")[1] : ""}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
