import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Gavel, LoaderCircle, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { getCorpusStats } from "@/lib/legal/ask.functions";
import { IDENTITY_BANNER, LEGAL_DISCLAIMER } from "@/lib/legal/copy";
import type { AskEval, PublicCitation } from "@/lib/legal/types";
import { sourceTypeLabelFa } from "@/lib/legal/types";
import { getChatHistory } from "@/lib/chat-history.functions";
import { listMyMatters, createMyMatter } from "@/lib/matter.functions";
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
    <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted" role="status">
      در حال آماده‌سازی پرونده و پیکره…
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

  /** تاریخچهٔ یک پرونده را بار می‌کند. خطا به کاربر گفته می‌شود، نه بلعیده. */
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
        // ۴۲۹ سقف نرخ است و پیام اختصاصی خودش را دارد؛ بقیه پیام عمومی.
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
          {/* هر صفحه باید یک h1 داشته باشد. حالت خالی تیتر بصری خودش را
              دارد، ولی به‌محض شروع گفت‌وگو آن تیتر برداشته می‌شد و صفحه
              بی‌h1 می‌ماند — ناوبری با screen reader را می‌شکند. */}
          {messages.length > 0 || busy ? (
            <h1 className="sr-only">پرسش حقوقی — گفت‌وگو با SAM AI</h1>
          ) : null}

          {messages.length === 0 && !busy && historyReady ? (
            <EmptyState
              onPick={(q) => void submit(q)}
              statuteCount={stats.byType.statute ?? 0}
            />
          ) : (
            <div
              className="flex flex-1 flex-col gap-5"
              // پاسخ به‌صورت توکن‌به‌توکن استریم می‌شود. بدون ناحیهٔ زنده،
              // کاربر screen reader هیچ‌وقت متنِ پاسخ را نمی‌شنود — یعنی
              // کل کارکرد محصول برای او در دسترس نیست (WCAG 4.1.3).
              // aria-busy در طول استریم به SR می‌گوید صبر کند و در پایان
              // یک‌بار بخواند، نه با هر قطعه.
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
                // قبلاً این تابع هیچ try/catch نداشت و از
                // `onClick={() => void onCreate()}` صدا زده می‌شد: اگر
                // createMyMatter رد می‌شد، یک unhandled rejection در کنسول
                // می‌نشست و از نظر کاربر دکمه بی‌صدا کار نمی‌کرد.
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
              // حلقهٔ فوکوس روی کل پوستهٔ نگارش.
              // textarea عمداً `focus:outline-none` دارد (تا دو حلقهٔ تودرتو
              // نداشته باشیم) — ولی پیش از این هیچ جایگزینی نداشت، یعنی
              // ورودی اصلیِ محصول با کیبورد هیچ نشانگر فوکوسی نمی‌گرفت.
              className="mt-3 flex items-end gap-2 rounded-xl border border-border bg-surface p-2 transition-colors focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/25"
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
        className="h-11 min-h-11 w-full min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-fg"
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
        className="h-11 min-h-11 shrink-0 rounded-md border border-border px-3 text-xs text-muted transition-colors hover:border-accent/40 hover:text-fg"
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
        <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
          مؤسسه حقوقی SAM AI
        </p>
        <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-fg">
          پرسش حقوقی خود را مطرح کنید؛
          <span className="block text-muted">پاسخ با ارجاع قابل راستی‌آزمایی به متن قانون.</span>
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
            // text-start به‌جای text-right: در RTL نتیجه یکی است، ولی این
            // خصوصیت منطقی است و در صورت افزودن نسخهٔ LTR هم درست می‌ماند.
            className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3 text-start text-sm text-fg transition-colors duration-150 hover:border-accent/40 hover:bg-elevated"
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
      {/* rounded-ss-sm (start-start) به‌جای rounded-tr-sm: در RTL همان
          گوشهٔ بالا-راست است، ولی منطقی و جهت-آگاه. */}
      <div className="max-w-[85%] break-words rounded-xl rounded-ss-sm bg-elevated px-4 py-3 text-sm leading-6">
        {text}
      </div>
    </div>
  );
}

function matchKindLabel(kind: PublicCitation["matchKind"]): string {
  if (kind === "exact_article") return "ماده دقیق";
  if (kind === "fts") return "تطبیق متنی";
  return "تطبیق معنایی";
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <Gavel className="size-3.5" aria-hidden="true" />
        SAM AI — پاسخ مستند
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
              <li key={s.id} className="rounded-md border border-border bg-elevated px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>منبع {i + 1}</span>
                  <span>{sourceTypeLabelFa(s.source_type)}</span>
                  <span className="text-accent-light">{s.authorityShort}</span>
                  <span>{matchKindLabel(s.matchKind)}</span>
                  {s.verified ? null : <span className="text-danger">استناد تأییدنشده</span>}
                </div>
                <p className="mt-1 text-sm text-fg">
                  {s.source_url ? (
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-light underline-offset-2 hover:underline"
                    >
                      {s.source_title}
                      {s.article_number
                        ? ` — ${s.source_title?.includes("اساسی") ? "اصل" : "ماده"} ${s.article_number}`
                        : ""}
                      <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
                    </a>
                  ) : (
                    <>
                      {s.source_title}
                      {s.article_number
                        ? ` — ${s.source_title?.includes("اساسی") ? "اصل" : "ماده"} ${s.article_number}`
                        : ""}
                    </>
                  )}
                  {s.law_date ? ` · ${s.law_date}` : ""}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted">{s.authorityLabel}</p>
                {s.quote ? (
                  <p className="mt-1 text-[12.5px] leading-6 text-subtle">{s.quote}</p>
                ) : null}
              </li>
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
    <div className="flex items-center gap-2 text-sm text-muted" role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      در حال بازیابی ماده و نگارش پاسخ…
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
    <div className="flex gap-1 rounded-lg bg-surface p-1" role="tablist" aria-label="فیلتر منبع">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            // min-w-0 لازم است: پیش‌فرض flex item برابر min-width:auto است و
            // زیر عرض محتوا کوچک نمی‌شود، پس برچسب بلندی مثل «نظریات مشورتی»
            // ردیف را از عرض صفحه پهن‌تر می‌کرد.
            "h-11 min-h-11 min-w-0 flex-1 rounded-md px-1 text-[13px] leading-tight transition-colors duration-150 sm:text-sm",
            value === item.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
