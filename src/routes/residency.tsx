import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/require-auth";
import { COUNTRIES_WITH_COVERAGE, COUNTRY_LABEL_FA } from "@/lib/residency/countries";

export const Route = createFileRoute("/residency")({
  component: ResidencyPage,
});

interface ChatTurn {
  question: string;
  answer?: string;
  error?: string;
  loading?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "شرایط اقامت دائم خانوادگی در ایالات متحده چیست؟",
  "برای پناهندگی در آلمان چه مدارکی لازم است؟",
  "مهلت اعتراض به رد درخواست ویزا در آمریکا چقدر است؟",
  "شرایط ویزای کار H-1B چیست؟",
  "روند رسیدگی به درخواست پناهندگی در اتحادیه اروپا چگونه است؟",
];

function flagEmoji(iso2: string): string {
  const codePoints = [...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const PRIORITY_COUNTRIES = ["US", "DE", "NL", "ES"];
const COUNTRY_OPTIONS = [
  { value: "ALL", label: "🌍 همه کشورها" },
  ...PRIORITY_COUNTRIES.map((c) => ({ value: c, label: `${flagEmoji(c)} ${COUNTRY_LABEL_FA[c]}` })),
  { value: "EU_GENERAL", label: "🇪🇺 قوانین عمومی اتحادیه اروپا" },
  ...COUNTRIES_WITH_COVERAGE.filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .sort((a, b) => (COUNTRY_LABEL_FA[a] || a).localeCompare(COUNTRY_LABEL_FA[b] || b, "fa"))
    .map((c) => ({ value: c, label: `${flagEmoji(c)} ${COUNTRY_LABEL_FA[c] || c}` })),
];

function ResidencyPage() {
  const [input, setInput] = useState("");
  const [country, setCountry] = useState("ALL");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  async function ask(question: string) {
    // گاردِ ارسال هم‌زمان. به‌روزرسانی وضعیت پایین با
    // `next[next.length - 1]` فرض می‌کند آخرین turn همان turnِ جاری است؛
    // دو ارسال هم‌زمان این فرض را می‌شکست و پاسخ یک پرسش روی پرسش دیگر
    // نوشته می‌شد. جلوی هزینهٔ دوبارهٔ embedding + مدل را هم می‌گیرد.
    if (!question.trim() || busy) return;
    setInput("");
    setBusy(true);
    setTurns((prev) => [...prev, { question, loading: true }]);

    /** فقط آخرین turn را به‌روز می‌کند. */
    const patchLast = (patch: Partial<ChatTurn>) => {
      setTurns((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], ...patch };
        return next;
      });
    };

    try {
      const res = await fetch("/api/residency-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question,
          country: country === "ALL" ? undefined : country,
        }),
      });

      // پاسخ موفق NDJSON استریم است: هر خط {"t":"r"|"c","d":"..."} — "r" تکه‌ای
      // از فکرکردنِ زنده‌ی مدل، "c" تکه‌ای از جواب نهایی. فقط خطاها JSON یک‌جا هستند.
      if (!res.ok || !res.body) {
        // بدنهٔ خطای سرور از قبل پیام امن و فارسی است (server-error.ts)، پس
        // نمایشش اشکالی ندارد. برای ۴۲۹ پیام اختصاصی سقف نرخ.
        let message =
          res.status === 429
            ? "تعداد درخواست‌های شما بیش از حد مجاز است. کمی بعد دوباره تلاش کنید."
            : "پاسخ در حال حاضر آماده نشد. لطفاً دوباره تلاش کنید.";
        try {
          const data = (await res.json()) as { error?: unknown };
          if (typeof data.error === "string" && data.error.trim()) message = data.error;
        } catch {
          /* بدنه JSON نبود */
        }
        patchLast({ error: message, loading: false });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";
      let answerSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let parsed: { t?: string; d?: string };
          try {
            parsed = JSON.parse(line);
          } catch {
            continue;
          }
          if (parsed.t === "c" && typeof parsed.d === "string") answerSoFar += parsed.d;
        }
        patchLast({
          loading: answerSoFar.length === 0,
          answer: answerSoFar || undefined,
        });
      }
      // استریم بدون هیچ قطعهٔ "c" تمام شد: نباید تا ابد در حالت loading بماند.
      if (!answerSoFar) {
        patchLast({
          loading: false,
          error: "پاسخی از منابع تهیه نشد. پرسش را دقیق‌تر بنویسید یا دوباره تلاش کنید.",
        });
      }
    } catch (err) {
      // پیام خام خطای JS (مثلاً «Failed to fetch» یا جزئیات TypeError) به
      // کاربر نشان داده نمی‌شود؛ در کنسول می‌ماند و کاربر یک پیام قابل‌فهم
      // و قابل‌اقدام می‌گیرد.
      console.error("[residency] ask failed", err);
      patchLast({
        error: "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
        loading: false,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
    <div className="min-h-dvh bg-bg text-fg">
      <AppHeader active="residency" corpusLabel="قوانین مهاجرت اروپا و آمریکا" />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          {/* SIDEBAR */}
          <aside className="order-2 flex flex-col gap-5 md:order-1">
            <div className="rounded-xl border border-border bg-elevated-2 p-6">
              {/* پیش از این یک <div> بود، نه <label>: هیچ پیوند برنامه‌ای
                  میان نوشته و کنترل وجود نداشت، پس screen reader این
                  select را بی‌نام می‌خواند (WCAG 3.3.2 / 4.1.2). */}
              <label htmlFor="residency-country" className="mb-1.5 block text-[13.5px] font-medium text-fg">
                کشور مورد نظر را انتخاب کنید
              </label>
              <p id="residency-country-hint" className="mb-4 text-[12px] leading-6 text-subtle">
                پاسخ‌ها بر اساس قوانین همان کشور جست‌وجو می‌شوند. این خدمت مشاورهٔ وکیل مجاز کشور مقصد نیست.
              </p>
              <select
                id="residency-country"
                aria-describedby="residency-country-hint"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-12 w-full cursor-pointer rounded-sm border border-border bg-bg px-3 text-sm text-fg transition-colors hover:border-n300 focus:border-fg focus:outline-none"
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-elevated-2 text-fg">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-border bg-elevated-2 p-6">
              <h2 className="mb-1 text-[13.5px] font-medium text-fg">نمونه سؤال‌ها</h2>
              <div className="flex flex-col">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={busy}
                    onClick={() => void ask(q)}
                    className="flex min-h-11 items-center border-b border-border-soft px-1 py-3 text-start text-[13px] leading-6 text-muted transition-colors first:border-t hover:text-fg disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* CHAT PANEL */}
          <section className="order-1 flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-elevated-2 md:order-2">
            <div className="border-b border-border px-6 py-5">
              <h1 className="t-h3 m-0 text-fg">پرسش‌وپاسخ اقامتی</h1>
              <p className="mt-1 text-[12.5px] text-subtle">
                پاسخ‌ها با جست‌وجوی اسنادی در متون رسمی مهاجرت تهیه می‌شود.
              </p>
            </div>

            {/* ناحیهٔ زنده: پاسخ استریم می‌شود، پس بدون این، کاربر screen
                reader هیچ‌وقت متن پاسخ را نمی‌شنود (WCAG 4.1.3). */}
            <div
              className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
              role="log"
              aria-label="گفت‌وگوی اقامتی"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={busy}
            >
              {turns.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-[13.5px] leading-7 text-subtle">
                  <Scale className="size-6 text-n300" aria-hidden="true" />
                  سؤالی درباره قوانین مهاجرت بنویسید یا یکی از نمونه‌ها را انتخاب کنید.
                </div>
              )}

              {turns.map((turn, i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  <div
                    className="self-end rounded-sm bg-elevated px-4 py-3 text-[14.5px] leading-7 text-fg"
                    style={{ maxWidth: "82%" }}
                  >
                    {turn.question}
                  </div>

                  {turn.loading ? (
                      <div className="flex items-center gap-2 text-[13.5px] text-muted" role="status">
                        <span className="pulse-dot" aria-hidden="true" /> در حال تهیه پاسخ از منابع رسمی…
                      </div>
                    ) : null}

                  {turn.error && (
                    <div
                      className="whitespace-pre-wrap break-words rounded-sm border border-danger/30 bg-danger-soft px-4 py-3 text-[13.5px] leading-7 text-danger-fg"
                      role="alert"
                    >
                      {turn.error}
                    </div>
                  )}

                  {turn.answer && (
                    <div
                      className="self-start break-words rounded-sm border border-border bg-bg px-5 py-4 text-[14.5px] leading-8 text-fg"
                      style={{ maxWidth: "95%", whiteSpace: "pre-wrap" }}
                    >
                      {turn.answer}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask(input);
              }}
              className="flex gap-2 border-t border-border bg-bg p-4"
            >
              <label htmlFor="residency-composer" className="sr-only">
                پرسش خود درباره قوانین مهاجرت
              </label>
              <input
                id="residency-composer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                enterKeyHint="send"
                maxLength={2000}
                disabled={busy}
                placeholder="پرسش خود را درباره قوانین مهاجرت بنویسید…"
                className="control-h-lg min-w-0 flex-1 rounded-sm border border-border bg-elevated-2 px-4 text-[14.5px] text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || input.trim().length === 0}
                className="control-h-lg shrink-0 rounded-sm bg-fg px-6 text-sm font-medium text-bg transition-colors hover:bg-n800 disabled:opacity-40"
              >
                {busy ? "در حال پرسش…" : "پرسیدن"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
    </RequireAuth>
  );
}
