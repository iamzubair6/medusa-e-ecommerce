import { z } from "zod";
import { sectionConfigSchemas, type SectionTypeKey } from "./sections";

export * from "./primitives";
export * from "./sections";
export * from "./nav";
export * from "./popup";
export * from "./campaign";
export * from "./admin-user";

/**
 * Validate a section's `config` against the schema for its type.
 * Throws a ZodError on invalid input — call before any DB write.
 */
export function parseSectionConfig<T extends SectionTypeKey>(
  type: T,
  config: unknown,
): z.infer<(typeof sectionConfigSchemas)[T]> {
  const schema = sectionConfigSchemas[type];
  return schema.parse(config) as z.infer<(typeof sectionConfigSchemas)[T]>;
}

/** Safe variant: returns a discriminated result instead of throwing. */
export function safeParseSectionConfig<T extends SectionTypeKey>(type: T, config: unknown) {
  return sectionConfigSchemas[type].safeParse(config);
}
