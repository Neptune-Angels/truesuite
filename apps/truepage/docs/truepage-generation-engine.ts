/**
 * TruePage.co — Generation Engine (v1 reference sketch)
 * ------------------------------------------------------
 * Companion to TruePage-v1-Feature-Spec.md §4 and §5.
 *
 * This is a reference implementation sketch, not production code. It shows:
 *   1. The system prompt that constrains the model to emit ONLY content_json.
 *   2. The schema + validation logic (the AI↔renderer contract).
 *   3. The generation pipeline: prompt → call → parse → validate → retry → fallback.
 *   4. Section-level regeneration.
 *
 * Stack assumptions (swap freely): TypeScript, Zod for validation,
 * Anthropic Messages API for generation. Model per env config; example uses
 * a Claude model string — confirm current availability before shipping.
 */

import { z } from "zod";

/* ============================================================
 * 1. SCHEMA — the contract (Feature Spec §4)
 * The AI must return exactly this shape. Renderer relies on it.
 * ============================================================ */

const CtaActionEnum = z.enum(["call", "form", "link"]);

const HeroSchema = z.object({
  headline: z.string().min(1).max(80),
  subheadline: z.string().min(1).max(160),
  cta_label: z.string().min(1).max(30),
  cta_action: CtaActionEnum,
  cta_value: z.string().min(1), // phone, anchor (#contact), or url
});

const ServiceItemSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
});

const ServicesSchema = z.object({
  heading: z.string().min(1).max(60),
  items: z.array(ServiceItemSchema).min(1).max(8),
});

const HoursRowSchema = z.object({
  day: z.string().min(1).max(12),
  open: z.string().max(10),   // "8:00 AM" — free text, may be empty if closed
  close: z.string().max(10),
  closed: z.boolean(),
});

const HoursSchema = z.object({
  heading: z.string().min(1).max(60),
  rows: z.array(HoursRowSchema).max(7),
});

const ContactSchema = z.object({
  heading: z.string().min(1).max(60),
  phone: z.string().max(30).nullable(),
  email: z.string().email().nullable().or(z.literal("").transform(() => null)),
  address: z.string().max(200).nullable(),
  show_form: z.boolean(),
});

const MetaSchema = z.object({
  business_name: z.string().min(1).max(80),
  tagline: z.string().max(120),
});

export const PageContentSchema = z.object({
  hero: HeroSchema,
  services: ServicesSchema,
  hours: HoursSchema,
  contact: ContactSchema,
  meta: MetaSchema,
});

export type PageContent = z.infer<typeof PageContentSchema>;

/* Section-level schemas, keyed for targeted regeneration (Feature Spec §5). */
const SECTION_SCHEMAS = {
  hero: HeroSchema,
  services: ServicesSchema,
  hours: HoursSchema,
  contact: ContactSchema,
  meta: MetaSchema,
} as const;

type SectionKey = keyof typeof SECTION_SCHEMAS;

/* ============================================================
 * 2. SYSTEM PROMPT — constrains output to content_json only
 * ============================================================ */

const SYSTEM_PROMPT = `You generate the content for a single mobile-first landing page for a small local business. The page is the destination of a QR code, so a visitor is usually standing in front of the business or holding a flyer, on a phone, deciding whether to act now.

Return ONLY a JSON object matching the schema below. No preamble, no explanation, no markdown code fences. The first character of your response must be "{" and the last must be "}".

Schema (all fields required; use null only where the field type allows it):
{
  "hero": {
    "headline": string,        // outcome-focused, <= 80 chars, no business jargon
    "subheadline": string,     // one supporting line, <= 160 chars
    "cta_label": string,       // active voice, e.g. "Call now", "Book a visit"
    "cta_action": "call" | "form" | "link",
    "cta_value": string        // phone number, "#contact", or a URL
  },
  "services": {
    "heading": string,
    "items": [ { "name": string, "description": string } ]  // 1 to 6 items
  },
  "hours": {
    "heading": string,
    "rows": [ { "day": string, "open": string, "close": string, "closed": boolean } ]
  },
  "contact": {
    "heading": string,
    "phone": string | null,
    "email": string | null,
    "address": string | null,
    "show_form": boolean
  },
  "meta": { "business_name": string, "tagline": string }
}

Writing rules:
- Plain, specific, active voice. Name what the visitor controls ("Call now", not "Submit").
- 8th-grade reading level. No buzzwords, no "unleash", "elevate", "seamless".
- Only state facts present or clearly implied in the business description. Never invent a phone number, address, price, award, or years-in-business. If a fact is unknown, set the field to null (where allowed) or omit it from prose — do not fabricate.
- If the description gives no hours, return an empty "rows" array. The renderer hides empty sections.
- Choose cta_action sensibly: "call" if a phone is the obvious action, "form" otherwise, "link" only if given a real URL.

If you cannot produce valid JSON for any reason, still return a best-effort object matching the schema. Never return prose.`;

/* User message builder: description + optional structured hints. */
function buildUserMessage(input: GenerationInput): string {
  const hints: string[] = [];
  if (input.brandColor) hints.push(`Brand color (for context only): ${input.brandColor}`);
  if (input.knownPhone) hints.push(`Known phone: ${input.knownPhone}`);
  if (input.knownEmail) hints.push(`Known email: ${input.knownEmail}`);
  if (input.knownAddress) hints.push(`Known address: ${input.knownAddress}`);

  return [
    `Business description:\n${input.description.trim()}`,
    hints.length ? `\nKnown facts (use these, do not contradict or invent beyond them):\n${hints.join("\n")}` : "",
  ].join("\n");
}

/* ============================================================
 * 3. GENERATION PIPELINE  (Feature Spec §5)
 * prompt → call → parse → validate → retry once → fallback
 * ============================================================ */

export interface GenerationInput {
  description: string;
  brandColor?: string;
  knownPhone?: string;
  knownEmail?: string;
  knownAddress?: string;
  // logo/photos are handled by the renderer, not the content model
}

interface GenerationResult {
  content: PageContent;
  usedFallback: boolean;
  attempts: number;
  tokenUsage?: { input: number; output: number }; // log per page (cost validation)
}

/**
 * Defensive parse: models sometimes wrap JSON in ```fences``` or add a stray
 * sentence despite instructions. Strip fences, then extract the outermost
 * {...} span before parsing.
 */
function extractJson(raw: string): unknown {
  let s = raw.trim();
  // Strip markdown fences if present.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Extract outermost object span.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(s.slice(first, last + 1));
}

/**
 * Calls the model. Replace `callModel` body with the real Anthropic SDK call.
 * Kept abstract so the pipeline logic is the focus.
 */
async function callModel(system: string, user: string): Promise<{ text: string; usage?: { input: number; output: number } }> {
  // PSEUDOCODE — wire to the Anthropic Messages API.
  // const res = await anthropic.messages.create({
  //   model: process.env.TRUEPAGE_MODEL!,   // confirm current model string at build time
  //   max_tokens: 1500,
  //   system,
  //   messages: [{ role: "user", content: user }],
  // });
  // const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
  // return { text, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
  throw new Error("callModel not wired — replace with Anthropic SDK call");
}

export async function generatePage(input: GenerationInput): Promise<GenerationResult> {
  const system = SYSTEM_PROMPT;
  const user = buildUserMessage(input);

  let lastErr: unknown;
  let lastUsage: { input: number; output: number } | undefined;

  // Try up to 2 times (initial + one retry), per spec §5.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, usage } = await callModel(
        system,
        // On retry, nudge harder toward strict JSON.
        attempt === 1 ? user : `${user}\n\nIMPORTANT: Your previous output was not valid JSON. Return ONLY the JSON object, starting with { and ending with }.`,
      );
      lastUsage = usage;
      const parsed = extractJson(text);
      const validated = PageContentSchema.parse(parsed); // throws on schema mismatch
      return { content: validated, usedFallback: false, attempts: attempt, tokenUsage: usage };
    } catch (err) {
      lastErr = err;
      // loop to retry
    }
  }

  // Both attempts failed — never show a broken page (spec §9). Use safe fallback.
  console.error("generatePage falling back after 2 attempts:", lastErr);
  return {
    content: buildFallback(input),
    usedFallback: true,
    attempts: 2,
    tokenUsage: lastUsage,
  };
}

/**
 * Fallback content: a valid, generic-but-usable page built deterministically
 * from whatever structured input we have. No model call. Guarantees a live page.
 */
function buildFallback(input: GenerationInput): PageContent {
  const name = input.description.split(/[.\n]/)[0]?.slice(0, 60).trim() || "Your Business";
  return {
    meta: { business_name: name, tagline: "" },
    hero: {
      headline: name,
      subheadline: "Get in touch to learn more.",
      cta_label: input.knownPhone ? "Call now" : "Contact us",
      cta_action: input.knownPhone ? "call" : "form",
      cta_value: input.knownPhone ?? "#contact",
    },
    services: { heading: "What we do", items: [{ name: "Our services", description: "Contact us for details." }] },
    hours: { heading: "Hours", rows: [] },
    contact: {
      heading: "Contact",
      phone: input.knownPhone ?? null,
      email: input.knownEmail ?? null,
      address: input.knownAddress ?? null,
      show_form: true,
    },
  };
}

/* ============================================================
 * 4. SECTION REGENERATION  (Feature Spec §5)
 * Re-prompt for one section only; validate against that section's schema.
 * ============================================================ */

export async function regenerateSection<K extends SectionKey>(
  section: K,
  input: GenerationInput,
  currentPage: PageContent,
): Promise<PageContent[K]> {
  const sectionSystem = `${SYSTEM_PROMPT}

You are regenerating ONLY the "${section}" section. Return ONLY the JSON value for that one section (its object/array as defined in the schema). Do not return the whole page. Keep it consistent with the rest of the page, summarized here:
${JSON.stringify({ ...currentPage, [section]: "<<regenerating this>>" })}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text } = await callModel(sectionSystem, buildUserMessage(input));
      const parsed = extractJson(text);
      return SECTION_SCHEMAS[section].parse(parsed) as PageContent[K];
    } catch {
      // retry once
    }
  }
  // On failure, keep the existing section rather than breaking the page.
  return currentPage[section];
}

/* ============================================================
 * 5. USAGE EXAMPLE
 * ============================================================ */
//
// const result = await generatePage({
//   description: "Joe's Plumbing — emergency and routine plumbing in Torrance. 20 years experience. Drain cleaning, water heaters, leak repair.",
//   knownPhone: "+1-310-555-0142",
//   brandColor: "#1B4965",
// });
//
// if (result.usedFallback) flagForReviewButStillPublish(result.content);
// logTokenUsage(result.tokenUsage);            // validate per-page cost vs Pro price
// renderPreview(result.content);               // templates own layout/styling
//
// // Later, user taps "Regenerate" on the hero:
// const newHero = await regenerateSection("hero", input, result.content);
// const updated = { ...result.content, hero: newHero };
