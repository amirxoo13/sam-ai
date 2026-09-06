import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { COUNTRIES_WITH_COVERAGE, COUNTRY_LABEL_FA } from "@/lib/residency/countries";

export const Route = createFileRoute("/residency")({
  component: ResidencyPage,
});

interface ChatTurn {
  question: string;
  thinking?: string;
  answer?: string;
  error?: string;
  loading?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "شرایط گرین کارت خانوادگی چیه؟",
  "برای پناهندگی در آلمان چه مدارکی لازمه؟",
  "مهلت اعتراض به رد درخواست ویزا در آمریکا چقدره؟",
  "شرایط ویزای کار H-1B چیست؟",
  "روند رسیدگی به درخواست پناهندگی در اتحادیه اروپا چطوره؟",
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    setTurns((prev) => [...prev, { question, loading: true }]);

    try {
      const res = await fetch("/api/residency-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          country: country === "ALL" ? undefined : country,
        }),
      });

      // پاسخ موفق NDJSON استریم است: هر خط {"t":"r"|"c","d":"..."} — "r" تکه‌ای
      // از فکرکردنِ زنده‌ی مدل، "c" تکه‌ای از جواب نهایی. فقط خطاها JSON یک‌جا هستند.
      if (!res.ok || !res.body) {
        let message = "خطای ناشناخته";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          /* بدنه JSON نبود */
        }
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], error: message, loading: false };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";
      let thinkingSoFar = "";
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
          if (parsed.t === "r" && typeof parsed.d === "string") thinkingSoFar += parsed.d;
          else if (parsed.t === "c" && typeof parsed.d === "string") answerSoFar += parsed.d;
        }
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            loading: answerSoFar.length === 0,
            thinking: thinkingSoFar || undefined,
            answer: answerSoFar || undefined,
          };
          return next;
        });
      }
    } catch (err) {
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          error: err instanceof Error ? err.message : "خطای شبکه",
          loading: false,
        };
        return next;
      });
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppHeader active="residency" corpusLabel="قوانین مهاجرت اروپا و آمریکا" />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="grid gap-7 md:grid-cols-[280px_1fr]">
          {/* SIDEBAR */}
          <aside className="order-2 flex flex-col gap-5 md:order-1">
            <div className="rounded-2xl border border-border bg-elevated-2 p-5">
              <div className="mb-1 text-[13px] font-bold text-fg">کشور موردنظرت رو انتخاب کن</div>
              <div className="mb-3 text-[11.5px] leading-7 text-subtle">
                پاسخ‌ها بر اساس قوانین همون کشور جست‌وجو می‌شوند.
              </div>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full cursor-pointer rounded-[10px] border px-3 py-[11px] text-sm"
                style={{ borderColor: "var(--color-warn)", background: "rgba(217,178,92,0.08)", color: "var(--color-accent-light)" }}
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-elevated text-fg">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-elevated-2 p-5">
              <div className="mb-3 text-[13px] font-bold text-fg">نمونه سؤال‌ها</div>
              <div className="flex flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="rounded-[10px] border border-border bg-elevated px-3 py-[10px] text-right text-[13px] leading-7 text-muted hover:text-fg"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* CHAT PANEL */}
          <section className="order-1 flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-elevated-2 md:order-2">
            <div className="border-b border-border px-5 py-4">
              <h1 className="m-0 text-[17px] font-bold">پرسش‌وپاسخ اقامتی</h1>
              <p className="mt-1 text-[12.5px] text-subtle">
                پاسخ‌ها با جست‌وجوی برداری در اسناد رسمی و تولید با Qwen3.8-Max ساخته می‌شوند.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
              {turns.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center text-sm text-subtle">
                  <div className="text-4xl">⚖️</div>
                  سؤالت را درباره قوانین مهاجرتی بنویس یا یکی از نمونه‌سؤال‌های کناری را انتخاب کن.
                </div>
              )}

              {turns.map((turn, i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  <div
                    className="self-end rounded-[16px_16px_3px_16px] px-4 py-[11px] text-[14.5px] text-white"
                    style={{ maxWidth: "82%", background: "linear-gradient(135deg, #1a8fa3 0%, #0e5f70 100%)" }}
                  >
                    {turn.question}
                  </div>

                  {turn.loading &&
                    (turn.thinking ? (
                      <div
                        className="self-start rounded-[16px_16px_16px_3px] border border-dashed px-4 py-[13px] text-[13.5px] italic leading-8 text-muted"
                        style={{ maxWidth: "90%", background: "var(--color-elevated)", borderColor: "var(--color-warn)", whiteSpace: "pre-wrap" }}
                      >
                        <div className="mb-1.5 flex items-center gap-2 not-italic">
                          <span className="pulse-dot" />
                          <span className="text-[12.5px] font-bold text-accent-light">🤔 در حال فکر کردن...</span>
                        </div>
                        {turn.thinking}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[13.5px] text-muted">
                        <span className="pulse-dot" /> در حال جست‌وجو در منابع رسمی...
                      </div>
                    ))}

                  {turn.error && (
                    <div
                      className="rounded-[10px] border px-3.5 py-3 text-[13.5px]"
                      style={{ background: "rgba(239,68,68,0.08)", borderColor: "var(--color-danger)", color: "#fca5a5", whiteSpace: "pre-wrap" }}
                    >
                      خطا: {turn.error}
                    </div>
                  )}

                  {turn.answer && (
                    <div
                      className="self-start rounded-[16px_16px_16px_3px] border border-border bg-elevated px-[18px] py-4 text-[14.5px] leading-8"
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
                ask(input);
              }}
              className="flex gap-2.5 border-t border-border bg-surface p-4"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سؤالت را درباره قوانین مهاجرتی بنویس..."
                className="flex-1 rounded-[10px] border border-border bg-elevated px-4 py-[13px] text-[14.5px] text-fg"
              />
              <button
                type="submit"
                className="rounded-xl px-6 py-3 text-sm font-bold"
                style={{ background: "linear-gradient(135deg, var(--color-accent-light), var(--color-accent) 60%, var(--color-warn))", color: "#1a1305" }}
              >
                پرسیدن
              </button>
            </form>
          </section>
        </div>
      </main>

      <style>{`
        .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--color-cyan);
          box-shadow: 0 0 0 0 rgba(52,214,232,0.6);
          animation: residency-pulse 1.4s infinite;
        }
        @keyframes residency-pulse {
          0% { box-shadow: 0 0 0 0 rgba(52,214,232,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(52,214,232,0); }
          100% { box-shadow: 0 0 0 0 rgba(52,214,232,0); }
        }
      `}</style>
    </div>
  );
}
