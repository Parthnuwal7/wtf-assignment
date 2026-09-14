import { z } from "zod";
import { synthesizeFollowUp } from "@/lib/ai/synthesizer";
import { appendConversationTurn, getConversation } from "@/lib/research/conversationStore";

const RequestSchema = z.object({
  conversationId: z.string().uuid(),
  question: z.string().trim().min(1).max(1_000),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Provide a valid conversation and follow-up question." }, { status: 400 });

  const conversation = getConversation(parsed.data.conversationId);
  if (!conversation) {
    return Response.json({ error: "This research session expired. Run the original question again." }, { status: 410 });
  }

  try {
    const synthesis = await synthesizeFollowUp(conversation.research, conversation.turns, parsed.data.question);
    appendConversationTurn(parsed.data.conversationId, { question: parsed.data.question, synthesis });
    return Response.json({ synthesis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Follow-up synthesis failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
