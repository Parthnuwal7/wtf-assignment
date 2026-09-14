import { describe, expect, it } from "vitest";
import { SynthesisModelOutputSchema } from "@/lib/ai/types";

const validFinding = { title: "Finding", detail: "Detail [1].", citationIds: [1] };

describe("SynthesisModelOutputSchema", () => {
  it("accepts an empty keyFindings list and reports insufficient evidence", () => {
    // Groq/DeepSeek return zero findings when the sources do not address the question.
    const parsed = SynthesisModelOutputSchema.safeParse({
      answerSummary: "The retrieved sources do not address this question.",
      keyFindings: [],
      evidenceLevel: "limited",
      limitations: ["No source discussed the topic."],
      citationIds: [],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.keyFindings).toEqual([]);
    expect(parsed.data.evidenceLevel).toBe("insufficient");
  });

  it("keeps the model's evidence level when findings are present", () => {
    const parsed = SynthesisModelOutputSchema.safeParse({
      answerSummary: "Summary [1].",
      keyFindings: [validFinding, validFinding],
      evidenceLevel: "moderate",
      limitations: [],
      citationIds: [1],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.evidenceLevel).toBe("moderate");
  });

  it("still rejects a finding with no citations", () => {
    const parsed = SynthesisModelOutputSchema.safeParse({
      answerSummary: "Summary.",
      keyFindings: [{ ...validFinding, citationIds: [] }],
      evidenceLevel: "limited",
      limitations: [],
      citationIds: [],
    });

    expect(parsed.success).toBe(false);
  });
});
