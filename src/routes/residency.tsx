import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/require-auth";
import { COUNTRIES_WITH_COVERAGE, COUNTRY_LABEL_FA } from "@/lib/residency/countries";
import { BRAND } from "@/lib/brand";
import { RESIDENCY_DISCLAIMER } from "@/lib/legal/copy";

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

const PRIORITY_COUNTRIES = ["US", "DE", "NL", "ES"];
const COUNTRY_OPTIONS = [
  { value: "ALL", label: "همه کشورها" },
  ...PRIORITY_COUNTRIES.map((c) => ({ value: c, label: COUNTRY_LABEL_FA[c] })),
  { value: "EU_GENERAL", label: "قوانین عمومی اتحادیه اروپا" },
  ...COUNTRIES_WITH_COVERAGE.filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .sort((a, b) => (COUNTRY_LABEL_FA[a] || a).localeCompare(COUNTRY_LABEL_FA[b] || b, "fa"))
    .map((c) => ({ value: c, label: COUNTRY_LABEL_FA[c] || c })),
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
    if (!question.trim() || busy) return;
    setInput("");
    setBusy(true);
    setTurns((prev) => [...prev, { question, loading: true }]);

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

      if (!res.ok || !res.body) {
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
      if (!answerSoFar) {
        patchLast({
          loading: false,
          error: "پاسخی از منابع تهیه نشد. پرسش را دقیق‌تر بنویسید یا دوباره تلاش کنید.",
        });
      }
    } catch (err) {
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
        <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8">
          <div className="grid min-w-0 gap-7 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <aside className="order-2 flex flex-col gap-5 md:order-1">
              <div className="rounded-[12px] border border-border bg-elevated p-5">
                <label htmlFor="residency-country" className="mb-1 block text-[13px] font-bold text-fg">
                  کشور مورد نظر را انتخاب کنید
                </label>
                <p id="residency-country-hint" className="mb-3 text-[11.5px] leading-7 text-subtle">
                  پاسخ‌ها بر اساس قوانین همان کشور جست‌وجو می‌شوند. {RESIDENCY_DISCLAIMER}
                </p>
                <select
                  id="residency-country"
                  aria-describedby="residency-country-hint"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 min-h-11 w-full cursor-pointer rounded-[8px] border border-border bg-site-50 px-3 text-sm text-fg"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-elevated text-fg">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[12px] border border-border bg-elevated p-5">
                <h2 className="mb-3 text-[13px] font-extrabold text-fg">نمونه سؤال‌ها</h2>
                <div className="flex flex-col gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={busy}
                      onClick={() => void ask(q)}
                      className="min-h-11 rounded-[8px] border border-border bg-site-50 px-3 py-2.5 text-start text-[13px] leading-7 text-muted transition-colors hover:border-site-400 hover:text-fg disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="order-1 flex min-h-[70vh] flex-col overflow-hidden rounded-[12px] border border-border bg-elevated md:order-2">
              <div className="border-b border-border px-5 py-4">
                <h1 className="m-0 text-[17px] font-extrabold">پرسش‌وپاسخ اقامتی</h1>
                <p className="mt-1 text-[12.5px] text-subtle">
                  پاسخ‌ها با جست‌وجوی اسنادی در متون رسمی مهاجرت تهیه می‌شود.
                </p>
              </div>

              <div
                className="flex flex-1 flex-col gap-5 overflow-y-auto p-5"
                role="log"
                aria-label="گفت‌وگوی اقامتی"
                aria-live="polite"
                aria-relevant="additions text"
                aria-busy={busy}
              >
                {turns.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-subtle">
                    <p className="max-w-sm text-[15px] font-semibold leading-7 text-fg">
                      سؤالی درباره قوانین مهاجرت بنویسید یا یکی از نمونه‌ها را انتخاب کنید.
                    </p>
                    <p className="max-w-sm text-[13px] leading-6">
                      {BRAND.short} پاسخ را از اسناد رسمی کشور انتخاب‌شده بازیابی می‌کند.
                    </p>
                  </div>
                )}

                {turns.map((turn, i) => (
                  <div key={i} className="flex flex-col gap-2.5">
                    <div
                      className="self-end rounded-[16px_16px_3px_16px] bg-fg px-4 py-[11px] text-[14.5px] text-accent-fg"
                      style={{ maxWidth: "82%" }}
                    >
                      {turn.question}
                    </div>

                    {turn.loading ? (
                      <div className="rounded-[12px] border border-border bg-site-50 p-4" role="status">
                        <p className="text-[13px] text-muted">در حال تهیه پاسخ از منابع رسمی…</p>
                        <div className="mt-3 space-y-2" aria-hidden="true">
                          <div className="skeleton-bar h-2.5 w-1/3" />
                          <div className="skeleton-bar h-2.5 w-full" />
                          <div className="skeleton-bar h-2.5 w-5/6" />
                        </div>
                      </div>
                    ) : null}

                    {turn.error && (
                      <div
                        className="whitespace-pre-wrap break-words rounded-[10px] border border-danger bg-danger-soft px-3.5 py-3 text-[13.5px] text-danger-fg"
                        role="alert"
                      >
                        {turn.error}
                      </div>
                    )}

                    {turn.answer && (
                      <div
                        className="self-start break-words rounded-[16px_16px_16px_3px] border border-border bg-elevated px-[18px] py-4 text-[14.5px] leading-8"
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
                className="flex gap-2.5 border-t border-border bg-site-50 p-4"
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
                  className="h-11 min-h-11 flex-1 rounded-[8px] border border-border bg-elevated px-4 text-[14.5px] text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={busy || input.trim().length === 0}
                  className="h-11 min-h-11 shrink-0 rounded-[8px] bg-fg px-6 text-sm font-bold text-accent-fg transition-colors hover:bg-site-800 disabled:opacity-50"
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
