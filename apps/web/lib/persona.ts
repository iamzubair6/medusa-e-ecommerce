import { z } from "zod";

/**
 * Persona section config (admin-editable, stored in CMS SiteSetting "persona").
 * Optional yes/no questions at checkout; completing all of them applies an extra
 * stacked discount via a Medusa promo `promoCode`.
 */
export const personaQuestionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(140),
});

export const personaSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().max(80).default("Persona"),
  bracket: z.string().max(160).default("Answer all questions to unlock an extra discount"),
  /** Medusa promo code applied when the persona is completed (create it in Discounts). */
  promoCode: z.string().max(40).default(""),
  /** Display-only hint of the reward, e.g. "2–4%". */
  discountHint: z.string().max(24).default("2–4%"),
  questions: z.array(personaQuestionSchema).max(12).default([]),
});

export type Persona = z.infer<typeof personaSchema>;
export type PersonaQuestion = z.infer<typeof personaQuestionSchema>;

export const DEFAULT_PERSONA: Persona = {
  enabled: false,
  title: "Persona",
  bracket: "Answer all questions to unlock an extra discount",
  promoCode: "",
  discountHint: "2–4%",
  questions: [],
};

/** Parse stored JSON into a valid Persona (falls back to defaults). */
export function parsePersona(raw: unknown): Persona {
  const r = personaSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_PERSONA;
}
