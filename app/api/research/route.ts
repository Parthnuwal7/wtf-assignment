import { z } from "zod";
import { prepareResearchContext } from "@/lib/research/prepareContext";

const RequestSchema = z.object({ question: z.string().trim().min(1).max(1_000) });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Provide a question between 1 and 1000 characters." }, { status: 400 });
  }

  try {
    return Response.json(await prepareResearchContext(parsed.data.question));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research pipeline failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
