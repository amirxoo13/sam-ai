import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { CitationChip } from "@/components/product/citation-chip";
import { getCorpusStats } from "@/lib/legal/ask.functions";
import { IDENTITY_BANNER, LEGAL_DISCLAIMER } from "@/lib/legal/copy";
import type { AskEval, PublicCitation } from "@/lib/legal/types";
import { getChatHistory } from "@/lib/chat-history.functions";
import { listMyMatters, createMyMatter } from "@/lib/matter.functions";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AskFilterChoice = "all" | "statute" | "case_law" | "advisory_opinion";

export const Route = createFileRoute("/ask")({
  loader: () =>
    getCorpusStats().catch(() => ({
      total: 0,
      embedded: 0,
      searchable: 0,
      byType: {} as Record<string, number>,
      byDataset: {} as Record<string, number>,
      backend: "unknown",
    })),
  pendingComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-bg px-6" role="status">
      <div className="w-full max-w-sm space-y-3">
        <div className="skeleton-bar h-3 w-1/3" />
        <div className="skeleton-bar h-3 w-full" />
        <div className="skeleton-bar h-3 w-4/5" />
        <p className="pt-2 text-sm text-muted">در حال آماده‌سازی پرونده و پیکره…</p>
      </div>
    </div>
  ),
  component: Home,
});

const SUGGESTIONS = [
  "ماده ۱۰ قانون مدنی چه می‌گوید؟",
  "شرایط صحت معامله در قانون مدنی چیست؟",
  "اصل ۳۵ قانون اساسی درباره حق وکیل چیست؟",
  "مدیران شرکت سهامی در قانون تجارت چه مسئولیت‌هایی دارند؟",
  "شرایط گرفتن پروانه وکالت در قانون وکالت چیست؟",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: PublicCitation[];
  usedFallback?: boolean;
  requestId?: string;
  unverifiedCites?: string[];
  eval?: AskEval;
};

function Home() {
  const stats = Route.useLoaderData();
  const [filter, setFilter] = useState<AskFilterChoice>("all");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [matterId, setMatterId] = useState<string | null>(null);
  const [matters, setMatters] = useState<{ id: string; title: string }[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    void (async () => {
      try {
        const list = await listMyMatters();
        setMatters(list);
        const current = list[0]?.id ?? null;
        setMatterId(current);
        if (current) {
          const hist = await getChatHistory({ data: { chatType: "legal", matterId: current } });
          setMessages(
            hist.map((row) => ({
              id: String(row.id),
              role: row.role,
              text: row.content,
            })),
          );
        }
      } catch {
        /* تاریخچه اختیاری است */
      } finally {
        setHistoryReady(true);
      }
    })();
  }, []);

  const corpusLabel = useMemo(() => {
    const statutes = stats.byType.statute ?? 0;
    const cases = stats.byType.case_law ?? 0;
    const embedded = "embedded" in stats ? Number(stats.embedded) : 0;
    return `${stats.total} سند · ${embedded} بردار کامل · ${cases} رأی · ${statutes} قانون`;
  }, [stats]);

  async function loadMatterHistory(id: string) {
    try {
      const hist = await getChatHistory({ data: { chatType: "legal", matterId: id } });
      setMessages(
        hist.map((row) => ({
          id: String(row.id),
          role: row.role,
          text: row.content,
        })),
      );
    } catch (err) {
      console.error("[ask] loading matter history failed", err);
      setError("تاریخچهٔ این پرونده بار نشد. صفحه را دوباره بارگذاری کنید.");
    }
  }

  async function submit(question: string) {
    const q = question.trim();
    if (q.length < 4 || busy) return;
    setError(null);
    setDraft("");
    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text: q },
      { id: assistantId, role: "assistant", text: "", sources: [] },
    ]);
    setBusy(true);
    try {
      const res = await fetch("/api/legal-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, sourceType: filter, matterId: matterId ?? undefined }),
      });
      if (!res.ok || !res.body) {
        throw new Error(
          res.status === 429
            ? "تعداد درخواست‌های شما بیش از حد مجاز است. کمی بعد دوباره تلاش کنید."
            : "پاسخ در حال حاضر آماده نشد.",
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) applyEvent(assistantId, buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) applyEvent(assistantId, line);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت پاسخ");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function applyEvent(assistantId: string, line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const ev = JSON.parse(trimmed) as {
        t: string;
        d?: string;
        sources?: PublicCitation[];
        error?: string;
        usedFallback?: boolean;
        requestId?: string;
        unverifiedCites?: string[];
        eval?: AskEval;
      };
      if (ev.t === "sources" && ev.sources) {
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, sources: ev.sources } : msg)),
        );
      } else if (ev.t === "c" && ev.d) {
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, text: msg.text + ev.d } : msg)),
        );
      } else if (ev.t === "done") {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  sources: ev.sources ?? msg.sources,
                  usedFallback: ev.usedFallback,
                  requestId: ev.requestId,
                  unverifiedCites: ev.unverifiedCites,
                  eval: ev.eval,
                }
              : msg,
          ),
        );
      } else if (ev.t === "error") {
        setError(ev.error || "خطا در دریافت پاسخ");
      }
    } catch {
      /* خط NDJSON ناقص */
    }
  }

  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col bg-bg">
        <AppHeader corpusLabel={corpusLabel} active="ask" />

        <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 pt-6">
          {messages.length > 0 || busy ? (
            <h1 className="sr-only">پرسش حقوقی — گفت‌وگو با {BRAND.name}</h1>
          ) : null}

          {messages.length === 0 && !busy && historyReady ? (
            <EmptyState
              onPick={(q) => void submit(q)}
              statuteCount={stats.byType.statute ?? 0}
            />
          ) : (
            <div
              className="flex flex-1 flex-col gap-5"
              role="log"
              aria-label="گفت‌وگوی حقوقی"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={busy}
            >
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
            <MatterBar
              matters={matters}
              value={matterId}
              onChange={(id) => {
                setMatterId(id);
                setError(null);
                void loadMatterHistory(id);
              }}
              onCreate={async () => {
                try {
                  setError(null);
                  const created = await createMyMatter({
                    data: { title: `پرونده ${matters.length + 1}` },
                  });
                  setMatters((m) => [created, ...m]);
                  setMatterId(created.id);
                  setMessages([]);
                } catch (err) {
                  console.error("[ask] creating a matter failed", err);
                  setError("ساخت پروندهٔ جدید انجام نشد. دوباره تلاش کنید.");
                }
              }}
            />
            <FilterBar value={filter} onChange={setFilter} />
            <form
              className="mt-3 flex items-end gap-2 rounded-[8px] border border-border bg-elevated p-2 transition-colors focus-within:border-fg/40 focus-within:ring-2 focus-within:ring-fg/15"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(draft);
              }}
            >
              <label htmlFor="ask-composer" className="sr-only">
                متن پرسش حقوقی
              </label>
              <textarea
                id="ask-composer"
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
                maxLength={2000}
                enterKeyHint="send"
                aria-describedby="ask-composer-hint"
                placeholder="پرسش حقوقی خود را با نام قانون و شماره ماده بنویسید…"
                className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none"
                disabled={busy}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || draft.trim().length < 4}
                aria-label="ارسال پرسش"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
              </Button>
            </form>
            <p id="ask-composer-hint" className="mt-2 text-center text-xs leading-5 text-subtle">
              {IDENTITY_BANNER} {LEGAL_DISCLAIMER}
            </p>
          </div>
        </footer>
      </div>
    </RequireAuth>
  );
}

function MatterBar({
  matters,
  value,
  onChange,
  onCreate,
}: {
  matters: { id: string; title: string }[];
  value: string | null;
  onChange: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="sr-only" htmlFor="matter-select">
        پرونده کاری
      </label>
      <select
        id="matter-select"
        className="h-11 min-h-11 w-full min-w-0 flex-1 rounded-[8px] border border-border bg-elevated px-2 text-sm text-fg"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {matters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void onCreate()}
        className="h-11 min-h-11 shrink-0 rounded-[8px] border border-border px-3 text-xs text-muted transition-colors hover:border-fg hover:text-fg"
      >
        پرونده جدید
      </button>
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
        <p className="text-xs font-medium tracking-[0.18em] text-subtle">{BRAND.name}</p>
        <h1 className="max-w-lg text-[1.75rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-3xl sm:leading-[1.2]">
          پرسش حقوقی خود را مطرح کنید؛
          <span className="mt-1 block font-bold text-muted">
            پاسخ با ارجاع قابل راستی‌آزمایی به متن قانون.
          </span>
        </h1>
        {statuteCount === 0 ? (
          <p className="text-sm text-danger" role="status">
            پیکره هنوز بارگذاری نشده است.
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <h2 className="sr-only">نمونه پرسش‌ها</h2>
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="min-h-11 rounded-[8px] border border-border bg-elevated px-4 py-3 text-start text-sm text-fg transition-colors duration-150 hover:border-site-400 hover:bg-site-50"
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
      <div className="max-w-[85%] break-words rounded-[8px] rounded-ss-sm bg-site-100 px-4 py-3 text-sm leading-6">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <article className="rounded-[12px] border border-border bg-elevated p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {BRAND.short} — پاسخ مستند
        {message.usedFallback ? (
          <span className="text-danger">بازیابی بدون مدل تولید</span>
        ) : null}
      </div>
      <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-fg">{message.text}</div>
      {message.sources && message.sources.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-medium text-muted">منابع استنادی</h3>
          <ul className="mt-2 grid gap-2">
            {message.sources.map((s, i) => (
              <CitationChip key={s.id} citation={s} index={i} />
            ))}
          </ul>
        </>
      ) : null}
      {message.eval ? (
        <p className="mt-3 text-[11.5px] leading-5 text-subtle">
          ارزیابی: {message.eval.retrieval.exactArticleHits} ماده دقیق ·{" "}
          {message.eval.answer.verified}/{message.eval.answer.cited || 0} استناد تأییدشده
          {message.requestId ? ` · شناسه ممیزی ${message.requestId.slice(0, 8)}` : ""}
        </p>
      ) : null}
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-subtle">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {LEGAL_DISCLAIMER}
      </p>
    </article>
  );
}

function ThinkingRow() {
  return (
    <div className="rounded-[12px] border border-border bg-elevated p-4" role="status">
      <p className="text-xs font-medium text-muted">در حال بازیابی ماده و نگارش پاسخ…</p>
      <div className="mt-3 space-y-2" aria-hidden="true">
        <div className="skeleton-bar h-2.5 w-1/3" />
        <div className="skeleton-bar h-2.5 w-full" />
        <div className="skeleton-bar h-2.5 w-11/12" />
        <div className="skeleton-bar h-2.5 w-4/5" />
      </div>
    </div>
  );
}

function FilterBar({
  value,
  onChange,
}: {
  value: AskFilterChoice;
  onChange: (v: AskFilterChoice) => void;
}) {
  const items: { id: AskFilterChoice; label: string }[] = [
    { id: "all", label: "همه" },
    { id: "statute", label: "قوانین" },
    { id: "case_law", label: "آرای قضایی" },
    { id: "advisory_opinion", label: "نظریات مشورتی" },
  ];
  return (
    <div className="flex gap-1 rounded-[8px] bg-site-100 p-1" role="tablist" aria-label="فیلتر منبع">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "h-11 min-h-11 min-w-0 flex-1 rounded-[8px] px-1 text-[13px] leading-tight transition-colors duration-150 sm:text-sm",
            value === item.id ? "bg-elevated font-semibold text-fg" : "text-muted hover:text-fg",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
