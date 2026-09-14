import { z } from "zod";

export const IntentSchema = z.enum([
  "evidence_question",
  "recommendation",
  "definition",
  "navigation",
  "general_question",
]);

export const CategorySchema = z.enum([
  "looks",
  "fitness",
  "style",
  "money",
  "dating",
  "mindset",
  "masculinity",
  "charisma",
  "other",
]);

export const PlannerModelOutputSchema = z.object({
  intent: IntentSchema,
  searchQuery: z.string().trim().min(1).max(160),
  category: CategorySchema,
  medicalContext: z.boolean(),
});

export type Intent = z.infer<typeof IntentSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type PlannerModelOutput = z.infer<typeof PlannerModelOutputSchema>;

export type RetrievalPlan = PlannerModelOutput & {
  usedPlannerFallback: boolean;
  fallbackReason?: string;
};

export const EvidenceLevelSchema = z.enum([
  "strong",
  "moderate",
  "limited",
  "insufficient",
  "mixed",
]);

export const SynthesisModelOutputSchema = z.object({
  answerSummary: z.string().trim().min(1).max(1_800),
  // Models legitimately return no findings when the sources do not address the
  // question; forcing a minimum would only pressure them to invent citations.
  keyFindings: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    detail: z.string().trim().min(1).max(700),
    citationIds: z.array(z.number().int().positive()).max(5),
  })).max(4),
  evidenceLevel: EvidenceLevelSchema,
  limitations: z.array(z.string().trim().min(1).max(500)).max(5),
}).transform((output) => (
  output.keyFindings.length === 0 ? { ...output, evidenceLevel: "insufficient" as const } : output
));

export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type SynthesisModelOutput = z.infer<typeof SynthesisModelOutputSchema>;
