"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { ConfidenceBadge, SourceBadge, StaleWarning, VerificationBadge } from "@/components/cultural-knowledge-badges";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { CulturalConfidence } from "@/features/cultural-knowledge/types";
import type { ConversationMessage } from "@/features/cultural-companion/schema";
import { formatDateTime } from "@/i18n/formatters";
import type { Locale } from "@/i18n/routing";

type Citation = {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  verificationStatus: string;
  authorityLevel: number;
  lastVerifiedAt: string | null;
  stale: boolean;
  confidence: CulturalConfidence;
};
type Result = {
  answer: string;
  confidence: CulturalConfidence;
  evidenceUsed: string[];
  evidence: Array<{ id: string; title: string; content: string; summary: string | null }>;
  citations: Citation[];
  uncertainty: boolean;
  recommendedAction: string;
  conflicts: string[];
  staleEvidence: string[];
  fallback: boolean;
};

const labels = {
  en: { title: "Cultural companion", intro: "Ask a question about this experience. Answers use approved MICHI evidence and show where it came from.", context: "Experience context is applied automatically", question: "Your question", ask: "Ask MICHI", loading: "Checking approved sources…", fresh: "Sources", uncertainty: "Evidence needs care", stale: "Some cited information is stale.", conflict: "Sources conflict at the same authority level. MICHI will not choose between them.", sources: "Evidence used", verified: "Last checked", action: "Suggested next step", start: "New conversation", empty: "Ask a question to see evidence-backed guidance.", error: "The companion could not check the approved sources. Please try again.", language: "Answer language", suggestions: ["What should I know before taking part?", "What rules are confirmed for this experience?", "What should I confirm with the host?"] },
  ja: { title: "文化コンパニオン", intro: "この体験について質問できます。承認済みのMICHIの情報と出典を表示します。", context: "体験の情報を自動で適用しています", question: "質問", ask: "MICHIに質問", loading: "承認済みの情報を確認中…", fresh: "出典", uncertainty: "情報の確認が必要です", stale: "引用した情報の一部は古い可能性があります。", conflict: "同じ権威レベルの出典に相違があります。MICHIは一方を選びません。", sources: "使用した情報", verified: "最終確認", action: "次のおすすめ", start: "新しい会話", empty: "質問すると、出典に基づく案内を表示します。", error: "承認済みの情報を確認できませんでした。もう一度お試しください。", language: "回答の言語", suggestions: ["参加前に知っておくことはありますか？", "この体験で確認されているルールは何ですか？", "ホストに確認すべきことは何ですか？"] },
} as const;

export function CulturalCompanion({ destinationId, destinationName, experienceId, experienceName }: { destinationId?: string; destinationName?: string; experienceId?: string; experienceName?: string }) {
  const currentLocale = useLocale() as Locale;
  const [language, setLanguage] = useState<"en" | "ja">(currentLocale);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = labels[language];
  useEffect(() => setLanguage(currentLocale), [currentLocale]);

  async function submitQuestion(value = question) {
    const trimmed = value.trim();
    if (busy || trimmed.length < 2) return;
    const userMessage: ConversationMessage = { role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage].slice(-7));
    setQuestion(""); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/ai/cultural-assistant", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed, destinationId, experienceId, language, conversationId, history: messages.slice(-6) }),
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.error);
      setResult(data);
      if (destinationId && data.citations.length > 0) {
        trackAnalyticsEvent({ eventName: "cultural_learning_interaction", destinationId, ...(experienceId ? { experienceId } : {}) });
      }
      const assistantMessage: ConversationMessage = { role: "assistant", content: data.answer };
      setMessages((current) => [...current, assistantMessage].slice(-7));
    } catch {
      setError(copy.error);
    } finally { setBusy(false); }
  }

  function startNewConversation() {
    setConversationId(crypto.randomUUID()); setMessages([]); setResult(null); setError("");
  }

  return <section aria-labelledby="cultural-companion-title" className="mt-10 border-t border-ink/15 pt-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Cultural intelligence · sourced answers</p><h2 id="cultural-companion-title" className="mt-2 font-serif text-2xl">{copy.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">{copy.intro}</p></div>
      <label className="grid gap-1 text-xs text-ink/70">{copy.language}<select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "ja")} className="min-h-11 border border-ink/20 bg-white px-3 text-sm text-ink"><option value="en">English</option><option value="ja">日本語</option></select></label>
    </div>
    {(experienceName || destinationName) ? <p className="mt-4 inline-flex border border-moss/25 bg-moss/5 px-3 py-2 text-xs text-ink/75">{copy.context}: {[experienceName, destinationName].filter(Boolean).join(" · ")}</p> : null}
    <div className="mt-5 border border-ink/15 bg-white">
      <div className="max-h-[26rem] space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && !result ? <p className="text-sm text-ink/60">{copy.empty}</p> : messages.map((message, index) => <div key={`${index}-${message.role}`} className={message.role === "user" ? "ml-6 border-l-2 border-vermilion pl-3" : "mr-6 border-l-2 border-moss pl-3"}><p className="text-[11px] font-semibold uppercase tracking-wide text-ink/55">{message.role === "user" ? (language === "ja" ? "質問" : "You") : "MICHI"}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/85">{message.content}</p></div>)}
        {busy ? <p role="status" className="border-l-2 border-moss pl-3 text-sm text-ink/60">{copy.loading}</p> : null}
        {error ? <p role="alert" className="border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm text-ink">{error}</p> : null}
      </div>
      <div className="border-t border-ink/10 p-4 sm:p-5">
        <p className="mb-2 text-xs font-semibold text-ink/65">{language === "ja" ? "質問例" : "Suggested questions"}</p>
        <div className="mb-4 flex flex-wrap gap-2">{copy.suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={busy} onClick={() => void submitQuestion(suggestion)} className="min-h-11 border border-ink/15 px-3 text-xs text-ink/75 hover:border-vermilion disabled:opacity-50">{suggestion}</button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); void submitQuestion(); }} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm"><span>{copy.question}</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1200} rows={2} required minLength={2} className="resize-y border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-vermilion" /></label>
          <button type="submit" disabled={busy || question.trim().length < 2} className="min-h-11 self-end bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.loading : copy.ask}</button>
        </form>
      </div>
    </div>
    {result ? <section aria-labelledby="companion-result-title" className="mt-5 border border-ink/15 bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2"><h3 id="companion-result-title" className="font-semibold text-ink">{copy.uncertainty}</h3><ConfidenceBadge confidence={result.confidence} />{result.fallback ? <span className="text-xs text-ink/55">{language === "ja" ? "AI要約なし · 取得した情報を表示" : "No AI summary · retrieved evidence shown"}</span> : null}</div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">{result.answer}</p>
      {result.uncertainty ? <p role="status" className="mt-3 border-l-2 border-vermilion bg-[#fbf1ed] px-3 py-2 text-xs text-ink/80">{language === "ja" ? "回答の確実性には限界があります。行動前に出典をご確認ください。" : "There are limits to this answer. Review the sources before acting."}</p> : null}
      {result.staleEvidence.length ? <p role="status" className="mt-3"><StaleWarning record={{ stale: true, lastVerifiedAt: result.citations.find((item) => item.stale)?.lastVerifiedAt ?? null, limitations: ["stale"] }} />{copy.stale}</p> : null}
      {result.conflicts.length ? <p role="status" className="mt-3 border-l-2 border-vermilion bg-[#fbf1ed] px-3 py-2 text-xs text-ink/80">{copy.conflict}</p> : null}
      <p className="mt-4 text-sm font-semibold text-ink">{copy.action}</p><p className="mt-1 text-sm leading-6 text-ink/70">{result.recommendedAction}</p>
      {result.citations.length ? <div className="mt-5"><h4 className="text-sm font-semibold">{copy.sources}</h4><ul className="mt-2 divide-y divide-ink/10 border-y border-ink/10">{result.citations.map((item) => <li key={item.id} className="py-3"><div className="flex flex-wrap gap-2"><SourceBadge sourceType={item.sourceType} sourceName={item.sourceName} /><VerificationBadge status={item.verificationStatus} /></div><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-words text-sm font-medium text-vermilion underline underline-offset-2">{item.title} · {item.sourceName}<span className="sr-only"> (opens in a new tab)</span></a><p className="mt-1 text-xs text-ink/55">Authority {item.authorityLevel}/5 · {copy.verified}: {item.lastVerifiedAt ? formatDateTime(item.lastVerifiedAt, language) : (language === "ja" ? "記録なし" : "not recorded")}</p>{item.stale ? <StaleWarning record={{ stale: true, lastVerifiedAt: item.lastVerifiedAt, limitations: ["stale"] }} /> : null}</li>)}</ul></div> : null}
      {result.evidence.length ? <details className="mt-4 border-t border-ink/10 pt-3"><summary className="cursor-pointer text-sm font-semibold text-ink">{language === "ja" ? "取得した原文情報を表示" : "Read retrieved source material"}</summary><div className="mt-3 space-y-4">{result.evidence.map((item) => <article key={item.id}><h4 className="text-sm font-medium">{item.title}</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/70">{item.summary || item.content}</p></article>)}</div></details> : null}
      <button type="button" onClick={startNewConversation} className="mt-4 min-h-10 text-sm font-semibold text-vermilion underline underline-offset-2">{copy.start}</button>
    </section> : null}
  </section>;
}
