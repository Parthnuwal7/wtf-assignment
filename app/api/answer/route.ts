import { z } from "zod";
import { synthesizeEvidence } from "@/lib/ai/synthesizer";
import { createConversation } from "@/lib/research/conversationStore";
import { prepareResearchContext } from "@/lib/research/prepareContext";

const RequestSchema = z.object({ question: z.string().trim().min(1).max(1_000) });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Provide a question between 1 and 1000 characters." }, { status: 400 });
  }

  try {
    const research = await prepareResearchContext(parsed.data.question);
    try {
      const synthesis = await synthesizeEvidence(research);
      const conversationId = createConversation(research, { question: research.question, synthesis });
      return Response.json({ research, synthesis, conversationId });
    } catch (error) {
      const synthesisError = error instanceof Error ? error.message : "Evidence synthesis failed.";
      return Response.json({ research, synthesisError });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evidence synthesis failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
