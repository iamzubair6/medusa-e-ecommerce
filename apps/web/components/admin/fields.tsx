"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@ecom/ui";

/** Shared label + error wrapper for admin form fields. */
function Field({
  label,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </span>
      )}
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

const base =
  "w-full rounded-sm border border-input bg-card/60 px-3.5 text-sm text-foreground transition-colors " +
  "placeholder:text-muted-foreground/50 hover:border-foreground/40 " +
  "focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-ring";

export function TextField({
  label,
  error,
  required,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; required?: boolean }) {
  return (
    <Field label={label} error={error} required={required} className={className}>
      <input className={cn(base, "h-12")} {...props} />
    </Field>
  );
}

export function TextareaField({
  label,
  error,
  required,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; required?: boolean }) {
  return (
    <Field label={label} error={error} required={required} className={className}>
      <textarea className={cn(base, "min-h-24 py-2.5")} {...props} />
    </Field>
  );
}

/** Native select styled with a custom chevron (keeps RHF `register` simple). */
export function SelectField({
  label,
  error,
  required,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; required?: boolean }) {
  return (
    <Field label={label} error={error} required={required} className={className}>
      <div className="relative">
        <select className={cn(base, "h-12 cursor-pointer appearance-none pr-10")} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      </div>
    </Field>
  );
}

export function CheckboxField({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm", className)}>
      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[hsl(var(--accent))]" {...props} />
      {label}
    </label>
  );
}
