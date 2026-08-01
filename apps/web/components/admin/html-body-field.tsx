"use client";

import { useState } from "react";
import { cn } from "@ecom/ui";
import { sanitizePageHtml } from "@/lib/content-pages";
import { RichTextField } from "./rich-text-field";

/**
 * Email body editor with two modes (#142):
 *  - Visual: the rich-text editor (fragments rendered inside the brand shell)
 *  - HTML source: a raw monospace editor — paste anything, including a FULL
 *    <!DOCTYPE html> document (full documents are sent as-is, no brand shell).
 *
 * `sourceOnly` pins the editor to the source textarea — used for body-template
 * skeletons, whose stored HTML must NEVER seed a contenteditable (it executes
 * there) and whose <style> blocks a visual round-trip would mangle.
 */
export function HtmlBodyField({
  label,
  value,
  onChange,
  sourceOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sourceOnly?: boolean;
}) {
  // Full documents can't round-trip through the visual editor — start in source.
  const [mode, setMode] = useState<"visual" | "html">(
    sourceOnly || looksLikeFullDocument(value) ? "html" : "visual",
  );
  const visual = mode === "visual" && !sourceOnly;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        {!sourceOnly && (
          <div className="flex rounded-sm border border-border p-0.5">
            {(["visual", "html"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "cursor-pointer rounded-[2px] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide transition-colors",
                  mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "visual" ? "Visual" : "HTML source"}
              </button>
            ))}
          </div>
        )}
      </div>
      {visual ? (
        // Stored HTML executes inside a contenteditable — strip active markup
        // before seeding, whatever route saved it (defense in depth).
        <RichTextField value={sanitizePageHtml(value)} onChange={onChange} />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={16}
          className="w-full rounded-sm border border-input bg-card/60 px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={`${label} — HTML source`}
        />
      )}
      {mode === "html" && (
        <p className="text-xs text-muted-foreground">
          Paste a fragment (wrapped in the brand shell) or a full{" "}
          <code className="rounded bg-muted px-1">&lt;!DOCTYPE html&gt;</code> document (sent exactly
          as pasted). Placeholders work in both: <code className="rounded bg-muted px-1">{"{name}"}</code>{" "}
          or <code className="rounded bg-muted px-1">{"{{name}}"}</code>.
        </p>
      )}
    </div>
  );
}

export function looksLikeFullDocument(html: string): boolean {
  const head = html.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}
