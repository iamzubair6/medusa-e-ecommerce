"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import type { Persona, PersonaQuestion } from "@/lib/persona";

let nextId = 0;
const newQ = (): PersonaQuestion => ({ id: `q${Date.now()}${nextId++}`, label: "" });

export function PersonaBuilder({ initial }: { initial: Persona }) {
  const router = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [title, setTitle] = useState(initial.title);
  const [bracket, setBracket] = useState(initial.bracket);
  const [promoCode, setPromoCode] = useState(initial.promoCode);
  const [discountHint, setDiscountHint] = useState(initial.discountHint);
  const [questions, setQuestions] = useState<PersonaQuestion[]>(initial.questions.length ? initial.questions : [newQ()]);
  const [saving, setSaving] = useState(false);

  const patchQ = (i: number, label: string) => setQuestions((qs) => qs.map((q, k) => (k === i ? { ...q, label } : q)));

  const save = async () => {
    setSaving(true);
    try {
      const body: Persona = {
        enabled,
        title: title.trim() || "Persona",
        bracket: bracket.trim(),
        promoCode: promoCode.trim().toUpperCase(),
        discountHint: discountHint.trim(),
        questions: questions.filter((q) => q.label.trim()).map((q) => ({ id: q.id, label: q.label.trim() })),
      };
      const res = await fetch("/api/admin/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Persona section saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex max-w-2xl flex-col gap-4 p-6">
      <CheckboxField label="Show the persona section at checkout" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Persona" />
      <TextField label="Bracket text (the line in parentheses)" value={bracket} onChange={(e) => setBracket(e.target.value)} placeholder="Answer all questions and get an extra 2–4% off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Reward hint (display only)" value={discountHint} onChange={(e) => setDiscountHint(e.target.value)} placeholder="2–4%" />
        <TextField label="Promo code to apply (create it in Discounts)" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="PERSONA" />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Yes/No questions</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((qs) => [...qs, newQ()])}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        </div>
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-end gap-2">
            <TextField className="flex-1" label={`Question ${i + 1}`} value={q.label} onChange={(e) => patchQ(i, e.target.value)} placeholder="Do you have a car?" />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => setQuestions((qs) => qs.filter((_, k) => k !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions yet — add at least one.</p>}
      </div>

      <div>
        <Button variant="gold" loading={saving} onClick={save} className="w-fit">Save persona section</Button>
        <p className="mt-2 text-xs text-muted-foreground">
          The reward is the Medusa promo with the code above — create/adjust its % in <strong>Discounts</strong>. It stacks on top of any regular promo when the shopper answers every question.
        </p>
      </div>
    </Card>
  );
}
