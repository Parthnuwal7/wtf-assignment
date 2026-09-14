import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeEvidence } from "@/lib/ai/synthesizer";
import type { PreparedResearchContext } from "@/lib/research/prepareContext";

const context = {
  question: "Does creatine work?",
  retrieval: {
    selectedSources: [
      { id: 1, title: "Creatine review", url: "/creatine", content: "Creatine increases strength." },
      { id: 2, title: "Creatine safety", url: "/creatine-safety", content: "Creatine is safe for healthy adults." },
    ],
    totalExtractedCharacters: 60,
  },
} as unknown as PreparedResearchContext;

function chatCompletion(content: unknown): Response {
  return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 100 } });
}

const groqRateLimitBody = {
  error: {
    message: "Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 5453, Requested 2697. Please try again in 1.125s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing",
    type: "tokens",
    code: "rate_limit_exceeded",
  },
};

describe("synthesizeEvidence via the Groq fallback", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("SYNTHESIS_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns an insufficient-evidence synthesis when the model has no findings to cite", async () => {
    globalThis.fetch = vi.fn(async () => chatCompletion({
      answerSummary: "The retrieved sources do not address this question.",
      keyFindings: [],
      evidenceLevel: "limited",
      limitations: ["No source discussed the topic."],
      citationIds: [],
    }));

    const synthesis = await synthesizeEvidence(context);

    expect(synthesis.keyFindings).toEqual([]);
    expect(synthesis.evidenceLevel).toBe("insufficient");
    expect(synthesis.citations).toEqual([]);
  });

  it("names the failing field when the model output does not match the schema", async () => {
    globalThis.fetch = vi.fn(async () => chatCompletion({
      answerSummary: "Summary [1].",
      keyFindings: [{ title: "Finding", detail: "Detail [1].", citationIds: [] }],
      evidenceLevel: "moderate",
      limitations: [],
      citationIds: [1],
    }));

    await expect(synthesizeEvidence(context)).rejects.toThrow(/keyFindings\.0\.citationIds/);
  });

  it("surfaces a readable rate-limit error on HTTP 429", async () => {
    globalThis.fetch = vi.fn(async () => Response.json(groqRateLimitBody, { status: 429 }));

    const error = await synthesizeEvidence(context).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(/rate limit/i);
    expect(message).toMatch(/try again in 1\.125s/);
    expect(message).not.toMatch(/org_x|console\.groq\.com/);
  });
});
