"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Heading, List, Link2, Eraser, Baseline, PaintBucket } from "lucide-react";
import { cn } from "@ecom/ui";

/**
 * Lightweight rich-text editor (no dependency) for product descriptions.
 * Uncontrolled internally — seeds once from `value`, emits HTML on input.
 */
export function RichTextField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed initial content once (avoids cursor jumps on every keystroke).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const addLink = () => {
    const url = prompt("Link URL (https://…)");
    if (url) exec("createLink", url);
  };

  const tools = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Underline, label: "Underline", run: () => exec("underline") },
    { icon: Heading, label: "Heading", run: () => exec("formatBlock", "h3") },
    { icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
    { icon: Link2, label: "Link", run: addLink },
    { icon: Eraser, label: "Clear formatting", run: () => exec("removeFormat") },
  ];

  return (
    <label className="flex flex-col gap-2">
      {label && <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>}
      <div className="overflow-hidden rounded-sm border border-input bg-card/60 focus-within:border-foreground focus-within:ring-1 focus-within:ring-ring">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={t.run}
              className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}

          {/* Text size */}
          <select
            title="Text size"
            aria-label="Text size"
            defaultValue=""
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) exec("fontSize", e.target.value);
              e.target.value = "";
            }}
            className="ml-1 cursor-pointer rounded border border-border bg-background px-1 py-1 text-xs text-muted-foreground"
          >
            <option value="" disabled>Size</option>
            <option value="2">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="6">X-Large</option>
          </select>

          {/* Text color */}
          <label title="Text color" className="ml-1 flex cursor-pointer items-center gap-1 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground">
            <Baseline className="h-4 w-4" />
            <input
              type="color"
              aria-label="Text color"
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => exec("foreColor", e.target.value)}
              className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>

          {/* Highlight / background color */}
          <label title="Highlight color" className="flex cursor-pointer items-center gap-1 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground">
            <PaintBucket className="h-4 w-4" />
            <input
              type="color"
              aria-label="Highlight color"
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => exec("hiliteColor", e.target.value)}
              className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
          className={cn(
            "min-h-32 px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none",
            "[&_a]:underline [&_h3]:my-1 [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ul]:my-1.5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 empty:before:text-muted-foreground/50 empty:before:content-['Describe_the_fabric,_fit,_styling…']",
          )}
        />
      </div>
    </label>
  );
}
