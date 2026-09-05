import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Gavel, LoaderCircle, Scale, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SamMark } from "@/components/sam-mark";
import { askLegal, getCorpusStats } from "@/lib/legal/ask.functions";
import { LEGAL_DISCLAIMER } from "@/lib/legal/copy";
import type { RetrievedChunk, SourceFilter } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: () => getCorpusStats(),
  component: Home,
});

const SUGGESTIONS = [
  "ماده ۱۰ قانون مدنی چه می‌گوید؟",
  "شرایط صحت معامله در قانون مدنی چیست؟",
  "اصل ۳۵ قانون اساسی درباره حق وکیل چیست؟",
  "مدیران شرکت سهامی در قانون تجارت چه مسئولیت‌هایی دارند؟",
  "شرایط بیمه بیکاری در قانون تأمین اجتماعی چیست؟",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: RetrievedChunk[];
  retrieved?: number;
};

function Home() {
  const stats = Route.useLoaderData();
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const corpusLabel = useMemo(() => {
    const statutes = stats.byType.statute ?? 0;
    const cases = stats.byType.case_law ?? 0;
    return `${stats.total} قطعه · ${cases} رأی · ${statutes} قانون`;
  }, [stats]);

  async function submit(question: string) {
    const q = question.trim();
    if (q.length < 4 || busy) return;
    setError(null);
    setDraft("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const result = await askLegal({ data: { question: q, sourceType: filter } });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.answer,
          sources: result.sources,
          retrieved: result.retrieved,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت پاسخ");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-accent">
            <SamMark className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-semibold tracking-tight">SAM AI</h1>
              <span className="hidden text-xs text-subtle sm:inline">Smart Attorney Mind</span>
            </div>
            <p className="truncate text-xs text-muted">{corpusLabel}</p>
          </div>
          <Scale className="size-4 shrink-0 text-subtle" aria-hidden />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 pt-6">
        {messages.length === 0 && !busy ? (
          <EmptyState
            onPick={(q) => void submit(q)}
            statuteCount={stats.byType.statute ?? 0}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} text={msg.text} />
              ) : (
                <AssistantBubble key={msg.id} message={msg} />
              ),
            )}
            {busy ? <ThinkingRow /> : null}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {error ? (
            <p className="mb-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <FilterBar value={filter} onChange={setFilter} />
          <form
            className="mt-3 flex items-end gap-2 rounded-xl border border-border bg-surface p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(draft);
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(draft);
                }
              }}
              rows={1}
              placeholder="پرسش حقوقی خود را بنویسید…"
              className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none"
              disabled={busy}
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || draft.trim().length < 4}
              aria-label="ارسال"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
          <p className="mt-2 text-center text-xs leading-5 text-subtle">
            پاسخ‌ها از بازیابی برداری روی متون حقوقی واقعی ساخته می‌شوند. {LEGAL_DISCLAIMER}.
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  onPick,
  statuteCount,
}: {
  onPick: (q: string) => void;
  statuteCount: number;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 pb-8">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
          Smart Attorney Mind
        </p>
        <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-fg">
          پرسش حقوقی را بپرسید؛
          <span className="block text-muted">پاسخ با ارجاع به منبع.</span>
        </h2>
        <p className="max-w-md text-sm leading-6 text-muted">
          SAM AI سؤال را embed می‌کند، نزدیک‌ترین مواد قانون و آرای قضایی را بازیابی
          می‌کند و فقط بر اساس همان متن پاسخ می‌دهد.
        </p>
        {statuteCount === 0 ? (
          <p className="max-w-md text-xs leading-5 text-warn">
            قوانین موضوعه هنوز در پیکره نیستند.
          </p>
        ) : (
          <p className="max-w-md text-xs leading-5 text-subtle">
            پیکره شامل متن کامل قوانین اصلی ایران، قوانین خاص (تجارت، ثبت، تأمین
            اجتماعی، …) و نظریات مشورتی است.
          </p>
        )}
      </div>
      <div className="grid gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3 text-right text-sm text-fg transition-colors duration-150 hover:bg-elevated"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-elevated px-4 py-3 text-sm leading-6">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <Gavel className="size-3.5" />
        SAM AI
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-fg">{message.text}</div>
      {message.sources && message.sources.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {message.sources.map((s, i) => (
            <li
              key={s.id}
              className="rounded-md border border-border bg-elevated px-3 py-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted">
                <BookOpen className="size-3.5 shrink-0" />
                <span>منبع {i + 1}</span>
                <span className="text-subtle">
                  {s.source_type === "statute" ? "قانون" : "رأی"}
                </span>
                <span className="ms-auto tabular-nums text-subtle">
                  {(Math.min(s.score, 1) * 100).toFixed(0)}٪
                </span>
              </div>
              <p className="mt-1 text-sm text-fg">
                {s.source_title}
                {s.article_number
                  ? ` — ${s.source_title?.includes("اساسی") ? "اصل" : "ماده"} ${s.article_number}`
                  : ""}
                {s.law_date ? ` · ${s.law_date}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-subtle">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        {LEGAL_DISCLAIMER}
      </p>
    </article>
  );
}

function ThinkingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <LoaderCircle className="size-4 animate-spin" />
      در حال بازیابی منابع و نگارش پاسخ…
    </div>
  );
}

function FilterBar({
  value,
  onChange,
}: {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
}) {
  const items: { id: SourceFilter; label: string }[] = [
    { id: "all", label: "همه" },
    { id: "case_law", label: "آرای قضایی" },
    { id: "statute", label: "قوانین" },
  ];
  return (
    <div className="flex gap-1 rounded-lg bg-surface p-1" role="tablist" aria-label="فیلتر منبع">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "h-11 min-h-11 flex-1 rounded-md text-sm transition-colors duration-150",
            value === item.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
