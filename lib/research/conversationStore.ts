import "server-only";

import { randomUUID } from "node:crypto";
import type { ConversationTurn } from "@/lib/ai/synthesizer";
import type { PreparedResearchContext } from "./prepareContext";

const TTL_MS = 20 * 60 * 1_000;
const MAX_TURNS = 6;

type StoredConversation = {
  research: PreparedResearchContext;
  turns: ConversationTurn[];
  expiresAt: number;
};

const conversations = new Map<string, StoredConversation>();

function clearExpired() {
  const now = Date.now();
  for (const [id, conversation] of conversations) {
    if (conversation.expiresAt <= now) conversations.delete(id);
  }
}

export function createConversation(research: PreparedResearchContext, firstTurn: ConversationTurn): string {
  clearExpired();
  const id = randomUUID();
  conversations.set(id, { research, turns: [firstTurn], expiresAt: Date.now() + TTL_MS });
  return id;
}

export function getConversation(id: string): StoredConversation | null {
  clearExpired();
  const conversation = conversations.get(id);
  if (!conversation) return null;
  conversation.expiresAt = Date.now() + TTL_MS;
  return conversation;
}

export function appendConversationTurn(id: string, turn: ConversationTurn): boolean {
  const conversation = getConversation(id);
  if (!conversation) return false;
  conversation.turns = [...conversation.turns, turn].slice(-MAX_TURNS);
  return true;
}
