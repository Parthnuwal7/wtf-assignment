# Looksmaxxing Guide Evidence Research

A time-boxed Next.js prototype that turns a natural-language question into an evidence-focused answer grounded in content from [looksmaxxing.guide](https://looksmaxxing.guide/).

## What it does

1. Groq plans a short lexical search query, intent, category, and medical-context flag.
2. Pagefind searches the target site's existing static index.
3. The server fetches the top matching articles and extracts clean article text.
4. DeepSeek produces a structured evidence summary, with Groq GPT-OSS-120B as an automatic fallback.
5. Users can ask follow-up questions against the same retrieved source set without repeating Pagefind retrieval or article fetching.

## Architecture

```text
Question
  -> Groq retrieval planner
  -> Pagefind
  -> top 8 sources
  -> article fetch + Cheerio extraction
  -> compact source brief
  -> DeepSeek evidence synthesis
       -> Groq GPT-OSS-120B fallback on failure
  -> cited answer + follow-ups
```

The client-side Pagefind integration uses a same-origin Next proxy because the remote Pagefind JavaScript does not provide the CORS headers needed for a localhost browser import. Server-side retrieval uses Pagefind directly.

## Features

- Structured Groq planner with Zod validation and a visible fallback if Groq is unavailable.
- Reuses the site's existing Pagefind index; no embeddings or vector database.
- Clean article extraction from `article`, with `data-pagefind-body` and `main` fallbacks.
- Eight retrieved sources, with a compact capped source brief sent to DeepSeek.
- Structured response: direct answer, 2–4 key findings, evidence level, limitations, and citations.
- Inline citations open the original source and show a preview on hover.
- Source and process popovers explain provenance.
- In-memory follow-up sessions reuse retrieved sources for 20 minutes.
- Provider-resilient synthesis: DeepSeek primary, Groq GPT-OSS-120B fallback, JSON repair, Zod validation, and verified citation IDs.

## Requirements

- Node.js 22+
- A Groq API key
- A DeepSeek API key

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
GROQ_API_KEY=
PLANNER_MODEL=openai/gpt-oss-20b
FALLBACK_SYNTHESIS_MODEL=openai/gpt-oss-120b
GROQ_SYNTHESIS_TIMEOUT_MS=20000

DEEPSEEK_API_KEY=
SYNTHESIS_MODEL=deepseek-flash
SYNTHESIS_PROVIDER=deepseek
DEEPSEEK_TIMEOUT_MS=10000
```

Never commit `.env`.

For a deployment, add the same values as hosted environment variables and redeploy after changing them. DeepSeek gets a short primary timeout before Groq takes over. Set `SYNTHESIS_PROVIDER=groq` to bypass DeepSeek during a known outage.

## Run locally

```bash
npm run dev
```

On Windows systems where PowerShell blocks npm scripts, use:

```powershell
npm.cmd run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Validation

```bash
npm run build
```

Useful test questions:

- `Does mewing actually work?`
- `How can I improve my jawline?`
- `What is bonesmashing?`

## Key endpoints

- `POST /api/research` — planner, Pagefind, and extraction only.
- `POST /api/answer` — full initial evidence answer; returns a `conversationId` when synthesis succeeds.
- `POST /api/follow-up` — sends a follow-up against an active research session.

## Cost and latency choices

- The first turn retrieves up to eight sources, then sends a stable source brief capped at 12,000 characters to the synthesis provider.
- Follow-ups reuse the original source brief and skip retrieval/fetching work.
- DeepSeek receives the stable brief as a fixed prefix, allowing its automatic context cache to reduce repeat-turn latency and input cost when a cache hit occurs.
- Synthesis output is capped at 1,200 tokens and uses non-thinking mode for concise evidence answers.
- DeepSeek gets one short attempt. Missing configuration, timeout, HTTP error, malformed output, or invalid citations automatically trigger Groq synthesis with strict JSON-schema output.

## Current limitations

- Follow-up sessions are stored in memory for 20 minutes. They work for a single server instance; a multi-instance deployment needs a shared TTL store or signed session state.
- Pagefind ranking is trusted as-is. There is no reranker by design.
- Article text is capped and extracted structurally, not semantically chunked.
- Source content is limited to looksmaxxing.guide; answers should not be treated as medical advice.

## Project structure

```text
app/
  api/answer/        Initial synthesis endpoint
  api/follow-up/     Follow-up endpoint
  api/research/      Retrieval/debug endpoint
  pagefind-proxy/    Same-origin client Pagefind proxy
lib/
  ai/                Groq planning and DeepSeek synthesis
  content/           Article fetching and extraction
  research/          Retrieval orchestration and conversation sessions
  search/            Pagefind providers and shared types
```
