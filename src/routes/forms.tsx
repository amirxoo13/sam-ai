import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Gavel,
  LoaderCircle,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  FORM_FIELDS,
  LEGAL_FORMS,
  type FormFieldId,
  type LegalForm,
  type LegalTrack,
} from "@/data/legal-forms";
import { draftLegal, getCorpusStats } from "@/lib/legal/ask.functions";
import { classifyMatter, type Classification } from "@/lib/legal/classify";
import { DRAFT_DISCLAIMER } from "@/lib/legal/copy";
import type { DraftResult } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forms")({
  loader: () => getCorpusStats(),
  component: FormsPage,
});

type Step = "story" | "path" | "fill";

const TRACK_FILTER: { id: "all" | LegalTrack; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "criminal", label: "کیفری" },
  { id: "civil", label: "حقوقی" },
  { id: "both", label: "هر دو" },
  { id: "admin", label: "اداری" },
];

function FormsPage() {
  const stats = Route.useLoaderData();
  const [step, setStep] = useState<Step>("story");
  const [answers, setAnswers] = useState<Partial<Record<FormFieldId, string>>>({
    story: "",
  });
  const [hasJudgment, setHasJudgment] = useState(false);
  const [formId, setFormId] = useState<string>("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogTrack, setCatalogTrack] = useState<"all" | LegalTrack>("all");
  const [cls, setCls] = useState<Classification | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [copied, setCopied] = useState(false);

  const story = answers.story?.trim() ?? "";
  const selected: LegalForm | undefined = LEGAL_FORMS.find((f) => f.id === formId);
  const catalog = useMemo(
    () =>
      catalogTrack === "all"
        ? LEGAL_FORMS
        : LEGAL_FORMS.filter((f) => f.track === catalogTrack),
    [catalogTrack],
  );

  function setField(id: FormFieldId, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function diagnose() {
    if (story.length < 8) return;
    setError(null);
    setResult(null);
    const next = classifyMatter({
      story,
      formId: formId || undefined,
      hasJudgment: hasJudgment || Boolean(answers.judgment?.trim()),
    });
    setCls(next);
    setFormId(next.form.id);
    setStep("path");
  }

  function pickForm(id: string) {
    setFormId(id);
    setShowCatalog(false);
    const next = classifyMatter({
      story: story || LEGAL_FORMS.find((f) => f.id === id)?.when || "شرح پرونده",
      formId: id,
      hasJudgment,
    });
    setCls(next);
    setStep("path");
  }

  async function generate() {
    if (story.length < 8 || busy) return;
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      const data = await draftLegal({
        data: {
          story,
          formId: formId || undefined,
          answers,
          hasJudgment: hasJudgment || Boolean(answers.judgment?.trim()),
        },
      });
      setResult(data);
      setCls(
        classifyMatter({
          story,
          formId: data.classification.formId,
          hasJudgment,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در تهیه پیش‌نویس");
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    if (!result?.draft) return;
    await navigator.clipboard.writeText(result.draft);
    setCopied(true);
  }

  function downloadDraft() {
    if (!result?.draft) return;
    const blob = new Blob([result.draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.classification.formTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const corpusLabel = `${stats.total} قطعه در پیکره · ${LEGAL_FORMS.length} قالب برگه`;
  const fields: FormFieldId[] = (selected ?? cls?.form)?.fields ?? [
    "story",
    "claimant",
    "respondent",
    "city",
    "date",
    "docs",
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader corpusLabel={corpusLabel} active="forms" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="space-y-2">
          <p className="text-xs font-medium tracking-[0.14em] text-subtle">
            تشخیص مسیر و پیش‌نویس اوراق
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight">
            مثل جلسه وکیل: اول ماجرا، بعد مسیر، بعد برگه.
          </h2>
          <p className="max-w-xl text-sm leading-6 text-muted">
            شرح را بگویید. SAM AI تشخیص می‌دهد دعوا حقوقی است یا کیفری، قالب
            شکواییه / دادخواست / لایحه را برمی‌گزیند و با مواد پیکره پیش‌نویس
            می‌نویسد.
          </p>
        </section>

        <ol className="grid grid-cols-3 gap-2" aria-label="مراحل">
          {(
            [
              { id: "story", label: "۱. ماجرا" },
              { id: "path", label: "۲. مسیر" },
              { id: "fill", label: "۳. پیش‌نویس" },
            ] as const
          ).map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-lg px-3 py-2 text-center text-xs",
                step === item.id
                  ? "bg-elevated text-fg"
                  : "bg-surface text-muted",
              )}
            >
              {item.label}
            </li>
          ))}
        </ol>

        {step === "story" ? (
          <section className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs text-muted">شرح ماجرا</span>
              <textarea
                value={answers.story ?? ""}
                onChange={(e) => setField("story", e.target.value)}
                rows={7}
                placeholder="از ابتدا تا امروز چه شده؟ مبلغ، تاریخ، محل، طرف مقابل و مدارک را بنویسید. اگر رأی صادر شده، آن را هم بگویید."
                className="min-h-32 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={hasJudgment}
                onChange={(e) => setHasJudgment(e.target.checked)}
                className="size-4 accent-fg"
              />
              رأی، قرار یا دادنامه صادر شده و می‌خواهم لایحه / اعتراض بنویسم
            </label>
            {hasJudgment ? (
              <label className="grid gap-1.5">
                <span className="text-xs text-muted">{FORM_FIELDS.judgment.label}</span>
                <textarea
                  value={answers.judgment ?? ""}
                  onChange={(e) => setField("judgment", e.target.value)}
                  rows={5}
                  placeholder={FORM_FIELDS.judgment.placeholder}
                  className="min-h-11 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>
            ) : null}
            <Button
              type="button"
              disabled={story.length < 8}
              onClick={diagnose}
              className="w-full"
            >
              <Scale className="size-4" />
              تشخیص مسیر حقوقی یا کیفری
            </Button>
            <button
              type="button"
              onClick={() => setShowCatalog((v) => !v)}
              className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              {showCatalog ? "بستن فهرست قالب‌ها" : "می‌دانم چه برگی می‌خواهم — فهرست قالب‌ها"}
            </button>
            {showCatalog ? (
              <Catalog
                track={catalogTrack}
                onTrack={setCatalogTrack}
                forms={catalog}
                selectedId={formId}
                onPick={pickForm}
              />
            ) : null}
          </section>
        ) : null}

        {step === "path" && cls ? (
          <PathCard
            cls={cls}
            onChangeForm={() => {
              setShowCatalog(true);
              setStep("story");
            }}
            onPickAlt={pickForm}
            onBack={() => setStep("story")}
            onContinue={() => setStep("fill")}
          />
        ) : null}

        {step === "fill" ? (
          <section className="grid gap-4">
            <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-6 text-muted">
              <span className="text-fg">{(selected ?? cls?.form)?.title}.</span>{" "}
              {(selected ?? cls?.form)?.when} ثبت از طریق {(selected ?? cls?.form)?.fileVia}.
            </p>
            <div className="grid gap-3">
              {fields
                .filter((id) => id !== "story")
                .map((id) => {
                  const meta = FORM_FIELDS[id];
                  const rows = meta.rows ?? 1;
                  return (
                    <label key={id} className="grid gap-1.5">
                      <span className="text-xs text-muted">{meta.label}</span>
                      {rows > 1 ? (
                        <textarea
                          value={answers[id] ?? ""}
                          onChange={(e) => setField(id, e.target.value)}
                          rows={rows}
                          placeholder={meta.placeholder}
                          className="min-h-11 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      ) : (
                        <input
                          value={answers[id] ?? ""}
                          onChange={(e) => setField(id, e.target.value)}
                          placeholder={meta.placeholder}
                          className="h-11 min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      )}
                    </label>
                  );
                })}
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("path")}
                className="sm:w-auto"
              >
                <ArrowRight className="size-4" />
                بازگشت
              </Button>
              <Button
                type="button"
                disabled={busy || story.length < 8}
                onClick={() => void generate()}
                className="flex-1"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    در حال بازیابی مواد و نگارش…
                  </>
                ) : (
                  <>
                    <Gavel className="size-4" />
                    تهیه پیش‌نویس
                  </>
                )}
              </Button>
            </div>
            {result ? (
              <ResultCard
                result={result}
                copied={copied}
                onCopy={() => void copyDraft()}
                onDownload={downloadDraft}
              />
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Catalog({
  track,
  onTrack,
  forms,
  selectedId,
  onPick,
}: {
  track: "all" | LegalTrack;
  onTrack: (t: "all" | LegalTrack) => void;
  forms: LegalForm[];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1 rounded-lg bg-surface p-1" role="tablist">
        {TRACK_FILTER.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={track === item.id}
            onClick={() => onTrack(item.id)}
            className={cn(
              "h-11 min-h-11 flex-1 rounded-md px-2 text-sm",
              track === item.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {forms.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f.id)}
            className={cn(
              "min-h-11 rounded-lg border px-4 py-3 text-right transition-colors duration-150",
              selectedId === f.id
                ? "border-fg bg-elevated"
                : "border-border bg-surface hover:bg-elevated",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-fg">
              <FileText className="size-3.5 shrink-0 text-muted" />
              {f.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">{f.forum}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PathCard({
  cls,
  onChangeForm,
  onPickAlt,
  onBack,
  onContinue,
}: {
  cls: Classification;
  onChangeForm: () => void;
  onPickAlt: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const trackColor =
    cls.track === "criminal"
      ? "text-danger"
      : cls.track === "civil"
        ? "text-accent"
        : "text-warn";
  return (
    <article className="space-y-5 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Scale className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", trackColor)}>مسیر: {cls.trackLabel}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{cls.advice}</p>
          <p className="mt-2 text-sm leading-6 text-fg">
            برگه پیشنهادی: {cls.form.title}
            <span className="text-subtle"> · </span>
            {cls.forum}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{cls.reason}</p>
          <p className="mt-1 text-xs text-subtle">
            اطمینان تشخیص: {cls.confidence === "high" ? "بالا" : "متوسط"} · ثبت: {cls.form.fileVia}
          </p>
        </div>
      </div>
      <ul className="grid gap-1 text-xs text-muted">
        {cls.form.articles.map((a) => (
          <li key={a}>— {a}</li>
        ))}
      </ul>
      {cls.alternatives.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs text-subtle">اگر موضوع چیز دیگری است:</p>
          <div className="flex flex-wrap gap-2">
            {cls.alternatives.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPickAlt(f.id)}
                className="min-h-11 rounded-md border border-border bg-elevated px-3 text-xs text-fg hover:border-fg"
              >
                {f.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ol className="grid gap-2">
        {cls.nextSteps.map((s, i) => (
          <li key={s.title} className="rounded-lg bg-elevated px-3 py-2">
            <p className="text-xs font-medium text-fg">
              {i + 1}. {s.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">{s.detail}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={onBack} className="sm:w-auto">
          <ArrowRight className="size-4" />
          اصلاح شرح
        </Button>
        <Button type="button" variant="ghost" onClick={onChangeForm} className="sm:w-auto">
          تغییر قالب
        </Button>
        <Button type="button" onClick={onContinue} className="flex-1">
          <Check className="size-4" />
          تکمیل مشخصات و نوشتن برگه
        </Button>
      </div>
    </article>
  );
}

function ResultCard({
  result,
  copied,
  onCopy,
  onDownload,
}: {
  result: DraftResult;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const c = result.classification;
  const trackColor =
    c.track === "criminal"
      ? "text-danger"
      : c.track === "civil"
        ? "text-accent"
        : "text-warn";
  return (
    <article className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <p className={cn("text-sm font-semibold", trackColor)}>مسیر: {c.trackLabel}</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {c.formTitle}
          <span className="text-subtle"> · </span>
          {c.forum}
        </p>
        {c.advice ? <p className="mt-1 text-sm leading-6 text-muted">{c.advice}</p> : null}
      </div>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-elevated px-4 py-3 text-sm leading-7 text-fg">
        {result.draft}
      </pre>
      <p className="text-xs text-subtle">
        {result.usedModel
          ? "متن با مدل و مواد بازیابی‌شده تنظیم شد."
          : "مدل تولید متن در دسترس نبود؛ قالب استاندارد پر شد."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onCopy}>
          <Copy className="size-4" />
          {copied ? "کپی شد" : "کپی پیش‌نویس"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDownload}>
          <Download className="size-4" />
          دانلود متن
        </Button>
      </div>
      {result.nextSteps.length > 0 ? (
        <ol className="grid gap-2">
          {result.nextSteps.map((s, i) => (
            <li key={s.title} className="text-xs leading-5 text-muted">
              {i + 1}. {s.title} — {s.detail}
            </li>
          ))}
        </ol>
      ) : null}
      {result.sources.length > 0 ? (
        <ul className="grid gap-2">
          {result.sources.slice(0, 4).map((s, i) => (
            <li
              key={s.id}
              className="rounded-md border border-border bg-elevated px-3 py-2 text-xs text-muted"
            >
              منبع {i + 1}: {s.source_title}
              {s.article_number ? ` — ماده ${s.article_number}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex items-start gap-2 text-xs leading-5 text-subtle">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        {DRAFT_DISCLAIMER}
      </p>
    </article>
  );
}
