import "server-only";

import { PlannerModelOutputSchema, type RetrievalPlan } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

const plannerInstructions = `You are a retrieval planner for looksmaxxing.guide. You never answer the user's question.
Return one JSON object with exactly these fields:
- intent: evidence_question | recommendation | definition | navigation | general_question
- searchQuery: a short lexical Pagefind query, preserving the important topic keywords
- category: looks | fitness | style | money | dating | mindset | masculinity | charisma | other
- medicalContext: boolean

Set medicalContext true when the request concerns health, anatomy, medical treatment, safety, or claimed physical effects on the body. Use evidence_question for questions asking whether a claim works or is supported. Keep searchQuery under 12 words. Do not include an answer, caveat, or explanation.`;

function fallbackPlan(question: string, reason: string): RetrievalPlan {
  return {
    intent: "general_question",
    searchQuery: question,
    category: "other",
    medicalContext: false,
    usedPlannerFallback: true,
    fallbackReason: reason,
  };
}

export async function planRetrieval(question: string): Promise<RetrievalPlan> {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    return fallbackPlan("", "The question was empty.");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackPlan(normalizedQuestion, "GROQ_API_KEY is not configured.");
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.PLANNER_MODEL || DEFAULT_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: plannerInstructions },
          { role: "user", content: normalizedQuestion },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackPlan(normalizedQuestion, `Groq returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return fallbackPlan(normalizedQuestion, "Groq returned no planner content.");
    }

    const parsedJson: unknown = JSON.parse(content);
    const parsedPlan = PlannerModelOutputSchema.safeParse(parsedJson);
    if (!parsedPlan.success) {
      return fallbackPlan(normalizedQuestion, "Groq returned an invalid planner shape.");
    }

    return { ...parsedPlan.data, usedPlannerFallback: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Groq planner request failed.";
    return fallbackPlan(normalizedQuestion, reason);
  }
}
