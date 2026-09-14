"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import type { EvidenceSynthesis } from "@/lib/ai/synthesizer";
import type { PreparedResearchContext } from "@/lib/research/prepareContext";

const validationQuestion = "Does mewing actually change your jawline after you're an adult?";

type PipelineResponse = {
  research: PreparedResearchContext;
  synthesis?: EvidenceSynthesis;
  synthesisError?: string;
  conversationId?: string;
};

type FollowUpResponse = { synthesis: EvidenceSynthesis } | { error: string };

type Source = PreparedResearchContext["retrieval"]["selectedSources"][number];

function SourceIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3.75h8.25L18 7.5v12.75H6zM14 3.75V7.5h4M8.5 11h7M8.5 14.5h7M8.5 18h4.25" /></svg>;
}

function ProcessIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 4.5h12M6 12h12M6 19.5h12M4.5 4.5h.01M4.5 12h.01M4.5 19.5h.01" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>;
}

function DetailPill({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const timer = useRef<number | null>(null);

  function clearTimer() {
    if (timer.current) window.clearTimeout(timer.current);
  }
  function openAfterDelay() {
    clearTimer();
    timer.current = window.setTimeout(() => setIsOpen(true), 300);
  }
  function closeAfterDelay() {
    clearTimer();
    timer.current = window.setTimeout(() => setIsOpen(false), 120);
  }

  useEffect(() => () => clearTimer(), []);

  return (
    <div className="detail-control" onMouseEnter={openAfterDelay} onMouseLeave={closeAfterDelay}>
      <button aria-expanded={isOpen} className="detail-pill" onClick={() => { clearTimer(); setIsOpen((open) => !open); }} onFocus={openAfterDelay} type="button">
        {icon}{label}
      </button>
      {isOpen && <section className="detail-popover" role="dialog" aria-label={label}>
        <button aria-label={`Close ${label}`} className="popover-close" onClick={() => setIsOpen(false)} type="button"><CloseIcon /></button>
        {children}
      </section>}
    </div>
  );
}

function InlineCitation({ sourceId, source }: { sourceId: number; source: Source }) {
  const [isVisible, setIsVisible] = useState(false);
  const timer = useRef<number | null>(null);
  function reveal() { if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setIsVisible(true), 300); }
  function hide() { if (timer.current) window.clearTimeout(timer.current); setIsVisible(false); }
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return (
    <span className="inline-citation" onMouseEnter={reveal} onMouseLeave={hide}>
      <a href={`https://looksmaxxing.guide${source.url}`} target="_blank" rel="noreferrer" onFocus={reveal} onBlur={hide}>[{sourceId}]</a>
      {isVisible && <span className="citation-tooltip" role="tooltip">
        <strong>{source.title}</strong>
        <span>{source.content.slice(0, 220)}{source.content.length > 220 ? "…" : ""}</span>
        <em>Open source ↗</em>
      </span>}
    </span>
  );
}

function AnswerText({ answer, sources }: { answer: string; sources: Source[] }) {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  return <div className="answer-copy">
    {answer.split(/\n{2,}/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}>
      {paragraph.split(/(\[\d+\])/g).map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const source = match ? sourcesById.get(Number(match[1])) : undefined;
        return source ? <InlineCitation key={`${part}-${index}`} sourceId={source.id} source={source} /> : part;
      })}
    </p>)}
  </div>;
}

function SynthesisContent({ synthesis, sources }: { synthesis: EvidenceSynthesis; sources: Source[] }) {
  return <>
    <div className="answer-summary"><AnswerText answer={synthesis.answerSummary} sources={sources} /></div>
    <section className="findings-section">
      <p className="eyebrow">What the sources point to</p>
      <div className="finding-grid">
        {synthesis.keyFindings.map((finding) => <article className="finding-card" key={finding.title}>
          <h3>{finding.title}</h3>
          <AnswerText answer={finding.detail} sources={sources} />
        </article>)}
      </div>
    </section>
  </>;
}

function SourcesDetail({ sources }: { sources: Source[] }) {
  return <>
    <p className="popover-eyebrow">Retrieved sources</p>
    <h3>{sources.length} sources informed this answer</h3>
    <div className="source-stack">
      {sources.map((source) => <a className="source-row" href={`https://looksmaxxing.guide${source.url}`} key={source.id} target="_blank" rel="noreferrer">
        <span className="source-index">{source.id}</span>
        <span><strong>{source.title}</strong><small>{source.url} · {source.content.length.toLocaleString()} characters</small></span>
        <span className="source-arrow">↗</span>
      </a>)}
    </div>
  </>;
}

function ProcessDetail({ research }: { research: PreparedResearchContext }) {
  const { plan, retrieval } = research;
  return <>
    <p className="popover-eyebrow">Research trace</p>
    <h3>How this answer was prepared</h3>
    <ol className="process-list">
      <li><span>01</span><div><strong>Question planning</strong><p>{plan.usedPlannerFallback ? "Fallback query used" : "Groq retrieval plan"}: “{plan.searchQuery}”</p><small>{plan.intent} · {plan.category} · medical {String(plan.medicalContext)}</small></div></li>
      <li><span>02</span><div><strong>Pagefind retrieval</strong><p>{retrieval.totalResults} lexical matches from looksmaxxing.guide</p></div></li>
      <li><span>03</span><div><strong>Source extraction</strong><p>{retrieval.selectedSources.length} articles cleaned to {retrieval.totalExtractedCharacters.toLocaleString()} characters</p></div></li>
      <li><span>04</span><div><strong>Evidence synthesis</strong><p>DeepSeek was instructed to cite only the retrieved source IDs.</p></div></li>
    </ol>
    {plan.fallbackReason && <p className="process-note">Planner fallback: {plan.fallbackReason}</p>}
  </>;
}

export default function Home() {
  const [question, setQuestion] = useState(validationQuestion);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [status, setStatus] = useState("Ask a question to build an evidence-grounded answer.");
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<Array<{ question: string; synthesis: EvidenceSynthesis }>>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus("Planning, retrieving sources, and reviewing evidence...");
    setResult(null);
    setFollowUps([]);
    try {
      const response = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const payload = (await response.json()) as PipelineResponse | { error: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "Research request failed.");
      if ("error" in payload) throw new Error(payload.error);
      setResult(payload);
      setStatus(payload.synthesis ? "Evidence review complete." : "Research context is ready; synthesis needs configuration.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Research request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result?.conversationId || !followUpQuestion.trim()) return;

    const submittedQuestion = followUpQuestion.trim();
    setIsFollowUpLoading(true);
    setStatus("Reviewing the follow-up against the same sources...");
    try {
      const response = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: result.conversationId, question: submittedQuestion }),
      });
      const payload = (await response.json()) as FollowUpResponse;
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Follow-up request failed.");
      setFollowUps((turns) => [...turns, { question: submittedQuestion, synthesis: payload.synthesis }]);
      setFollowUpQuestion("");
      setStatus("Follow-up complete.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Follow-up request failed.");
    } finally {
      setIsFollowUpLoading(false);
    }
  }

  const sources = result?.research.retrieval.selectedSources ?? [];

  return <main className="site-shell">
    <header className="site-header"><a className="wordmark" href="/">looksmaxxing<span>.guide</span></a><p>Evidence research</p></header>
    <section className="intro-panel">
      <p className="eyebrow">Research, not hype</p>
      <h1>Ask what actually holds up.</h1>
      <p className="intro-copy">Searches the site’s published material, then grounds the answer in the sources it used.</p>
      <form className="question-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="research-question">Research question</label>
        <input id="research-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about looks, fitness, style, or self-improvement" />
        <button disabled={isLoading} type="submit">{isLoading ? "Researching…" : "Research"}</button>
      </form>
      <p className="status-line" role="status">{status}</p>
    </section>
    {result && <section className="answer-panel" aria-live="polite">
      {result.synthesis ? <>
        <div className="answer-meta"><span>Evidence review</span><span className={`evidence-badge evidence-${result.synthesis.evidenceLevel}`}>{result.synthesis.evidenceLevel} evidence</span></div>
        <SynthesisContent synthesis={result.synthesis} sources={sources} />
        <div className="limitations"><p>Limitations</p><ul>{result.synthesis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>
        <footer className="answer-footer"><p>Built from {sources.length} retrieved sources.</p><div className="answer-actions"><DetailPill icon={<SourceIcon />} label="Sources"><SourcesDetail sources={sources} /></DetailPill><DetailPill icon={<ProcessIcon />} label="Process"><ProcessDetail research={result.research} /></DetailPill></div></footer>
        {result.conversationId && <section className="follow-up-section">
          {followUps.map((turn, index) => <article className="follow-up-answer" key={`${index}-${turn.question}`}>
            <p className="follow-up-question">You asked: {turn.question}</p>
            <div className="answer-meta"><span>Follow-up</span><span className={`evidence-badge evidence-${turn.synthesis.evidenceLevel}`}>{turn.synthesis.evidenceLevel} evidence</span></div>
            <SynthesisContent synthesis={turn.synthesis} sources={sources} />
            <div className="limitations"><p>Limitations</p><ul>{turn.synthesis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>
          </article>)}
          <form className="follow-up-form" onSubmit={handleFollowUp}>
            <label htmlFor="follow-up-question">Ask a follow-up about these sources</label>
            <div><input id="follow-up-question" value={followUpQuestion} onChange={(event) => setFollowUpQuestion(event.target.value)} placeholder="For example: What are the realistic alternatives?" /><button disabled={isFollowUpLoading || !followUpQuestion.trim()} type="submit">{isFollowUpLoading ? "Reviewing…" : "Ask follow-up"}</button></div>
          </form>
        </section>}
      </> : <>
        <p className="eyebrow">Research context ready</p><h2>The source review completed, but synthesis is unavailable.</h2><p className="configuration-note">{result.synthesisError ?? "Configure DeepSeek to generate the evidence summary."}</p>
        <footer className="answer-footer"><p>{sources.length} sources are ready for synthesis.</p><div className="answer-actions"><DetailPill icon={<SourceIcon />} label="Sources"><SourcesDetail sources={sources} /></DetailPill><DetailPill icon={<ProcessIcon />} label="Process"><ProcessDetail research={result.research} /></DetailPill></div></footer>
      </>}
    </section>}
  </main>;
}
