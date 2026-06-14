"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Sparkles } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { useToast } from "./toast";
import {
  landingModeSchema,
  landingModeFor,
  type LandingMode,
  type LandingPageKey,
  type LandingPageMode,
} from "@/lib/landing-mode";

type PageRow = { key: LandingPageKey; label: string };

const OPTIONS: { value: LandingPageMode; label: string; hint: string; icon: typeof LayoutTemplate }[] = [
  { value: "sections", label: "CMS Sections", hint: "Published page layout", icon: LayoutTemplate },
  { value: "curated", label: "Fashion-Nova Landing", hint: "Curated component", icon: Sparkles },
];

/** Two-option segmented control for a single landing page's render mode. */
function ModeToggle({
  value,
  onChange,
  name,
}: {
  value: LandingPageMode;
  onChange: (next: LandingPageMode) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors",
              active
                ? "border-foreground bg-primary text-primary-foreground"
                : "border-input bg-card/60 text-foreground/70 hover:border-foreground/40",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className={cn("text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {opt.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Admin editor for the per-landing-page render mode (RHF + Zod). Saves the
 * "landingMode" SiteSetting via /api/admin/landing-mode. One control per page
 * (Home + each division) toggling between CMS Sections and the curated Landing.
 */
export function LandingModeEditor({ initial, pages }: { initial: LandingMode; pages: PageRow[] }) {
  const router = useRouter();
  const toast = useToast();
  // Resolve every page to a concrete mode up front so each control is controlled
  // (unset keys default to "sections" via landingModeFor).
  const defaultValues: LandingMode = Object.fromEntries(
    pages.map((p) => [p.key, landingModeFor(initial, p.key)]),
  ) as LandingMode;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LandingMode>({
    resolver: zodResolver(landingModeSchema),
    defaultValues,
  });

  const onSubmit = async (values: LandingMode) => {
    try {
      const res = await fetch("/api/admin/landing-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Landing style saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-2xl flex-col gap-6">
      <Card className="flex flex-col gap-5 p-6">
        {pages.map((page) => (
          <Controller
            key={page.key}
            control={control}
            name={page.key}
            render={({ field }) => (
              <div className="flex flex-col gap-2 border-b border-border pb-5 last:border-0 last:pb-0">
                <span className="font-display text-base font-bold">{page.label}</span>
                <ModeToggle name={page.label} value={field.value ?? "sections"} onChange={field.onChange} />
              </div>
            )}
          />
        ))}
      </Card>

      <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
        Save landing style
      </Button>
    </form>
  );
}
