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
import { RequireAuth } from "@/components/require-auth";
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
import { BRAND } from "@/lib/brand";
import { DRAFT_DISCLAIMER } from "@/lib/legal/copy";
import type { DraftResult } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forms")({
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
      در حال آماده‌سازی برگه‌ها…
    </div>
  ),
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

const STEPS: { id: Step; label: string }[] = [
  { id: "story", label: "ماجرا" },
  { id: "path", label: "مسیر" },
  { id: "fill", label: "پیش‌نویس" },
];

function StepIndicator({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center" aria-label="مراحل">
      {STEPS.map((item, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <li key={item.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium transition-colors",
                  isActive
                    ? "border-fg bg-fg text-bg"
                    : isDone
                      ? "border-n300 bg-elevated-2 text-fg"
                      : "border-border bg-elevated-2 text-subtle",
                )}
              >
                {isDone ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  (i + 1).toLocaleString("fa-IR")
                )}
              </div>
              <span
                className={cn(
                  "text-[11.5px]",
                  isActive ? "font-medium text-fg" : isDone ? "text-muted" : "text-subtle",
                )}
              >
                {item.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div
                className={cn("mx-2 h-px flex-1 transition-colors", isDone ? "bg-n400" : "bg-border")}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

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

  const corpusLabel = `${Number(stats.total ?? 0).toLocaleString("fa-IR")} قطعه در پیکره · ${LEGAL_FORMS.length.toLocaleString("fa-IR")} قالب برگه`;
  const fields: FormFieldId[] = (selected ?? cls?.form)?.fields ?? [
    "story",
    "claimant",
    "respondent",
    "city",
    "date",
    "docs",
  ];

  return (
    <RequireAuth>
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader corpusLabel={corpusLabel} active="forms" />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        {/* این صفحه پیش از این هیچ h1 نداشت و با h2 شروع می‌شد — ناوبری با
            screen reader را می‌شکست (WCAG 1.3.1). */}
        <section className="mb-8">
          <p className="t-eyebrow flex items-center gap-2">
            <Scale className="size-3.5" aria-hidden="true" />
            تشخیص مسیر و پیش‌نویس اوراق
          </p>
          <h1 className="t-h1 mt-3 text-fg">
            مثل جلسهٔ وکیل: اول ماجرا، بعد مسیر، بعد برگه.
          </h1>
          <p className="t-body mt-4 max-w-xl text-muted">
            شرح را بگویید. {BRAND.name} تشخیص می‌دهد دعوا حقوقی است یا کیفری،
            قالب شکواییه / دادخواست / لایحه را برمی‌گزیند و با مواد پیکره
            پیش‌نویس می‌نویسد.
          </p>
        </section>

        <div className="rounded-xl border border-border bg-elevated-2 p-6 sm:p-8">
          <StepIndicator step={step} />

        <div className="mt-6">
        {step === "story" ? (
          <section className="grid gap-6">
            <label className="grid gap-2">
              <span className="text-[13px] font-medium text-fg">شرح ماجرا</span>
              <textarea
                value={answers.story ?? ""}
                onChange={(e) => setField("story", e.target.value)}
                rows={7}
                placeholder="از ابتدا تا امروز چه شده؟ مبلغ، تاریخ، محل، طرف مقابل و مدارک را بنویسید. اگر رأی صادر شده، آن را هم بگویید."
                className="min-h-36 resize-y rounded-sm border border-border bg-bg px-4 py-3 text-sm leading-8 text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
              />
            </label>
            <label
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-[13px] leading-6 transition-colors",
                hasJudgment ? "border-fg bg-elevated text-fg" : "border-border bg-bg text-muted hover:border-n300",
              )}
            >
              <input
                type="checkbox"
                checked={hasJudgment}
                onChange={(e) => setHasJudgment(e.target.checked)}
                className="size-4 shrink-0"
              />
              رأی، قرار یا دادنامه صادر شده و می‌خواهم لایحه / اعتراض بنویسم
            </label>
            {hasJudgment ? (
              <label className="grid gap-2">
                <span className="text-[13px] font-medium text-fg">
                  {FORM_FIELDS.judgment.label}
                </span>
                <textarea
                  value={answers.judgment ?? ""}
                  onChange={(e) => setField("judgment", e.target.value)}
                  rows={5}
                  placeholder={FORM_FIELDS.judgment.placeholder}
                  className="min-h-24 resize-y rounded-sm border border-border bg-bg px-4 py-3 text-sm leading-8 text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
                />
              </label>
            ) : null}
            <Button
              type="button"
              variant="premium"
              size="lg"
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
              className="link-inline inline-flex min-h-11 w-fit items-center text-[13.5px] font-medium"
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
          <section className="grid gap-6">
            <p className="rounded-sm border-s-2 border-n300 bg-elevated px-4 py-3 text-sm leading-7 text-muted">
              <span className="font-medium text-fg">{(selected ?? cls?.form)?.title}.</span>{" "}
              {(selected ?? cls?.form)?.when} ثبت از طریق {(selected ?? cls?.form)?.fileVia}.
            </p>
            <div className="grid gap-5">
              {fields
                .filter((id) => id !== "story")
                .map((id) => {
                  const meta = FORM_FIELDS[id];
                  const rows = meta.rows ?? 1;
                  return (
                    <label key={id} className="grid gap-2">
                      <span className="text-[13px] font-medium text-fg">{meta.label}</span>
                      {rows > 1 ? (
                        <textarea
                          value={answers[id] ?? ""}
                          onChange={(e) => setField(id, e.target.value)}
                          rows={rows}
                          placeholder={meta.placeholder}
                          className="min-h-24 resize-y rounded-sm border border-border bg-bg px-4 py-3 text-sm leading-8 text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
                        />
                      ) : (
                        <input
                          value={answers[id] ?? ""}
                          onChange={(e) => setField(id, e.target.value)}
                          placeholder={meta.placeholder}
                          className="h-12 rounded-sm border border-border bg-bg px-4 text-sm text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
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
                variant="premium"
                size="lg"
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
        </div>
        </div>
      </main>
    </div>
    </RequireAuth>
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
      <div className="flex flex-wrap gap-1 rounded-sm bg-surface p-1" role="tablist" aria-label="نوع پرونده">
        {TRACK_FILTER.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={track === item.id}
            onClick={() => onTrack(item.id)}
            className={cn(
              "control-h flex-1 rounded-sm px-2 text-[13px] transition-colors",
              track === item.id
                ? "bg-elevated-2 font-medium text-fg shadow-[0_1px_2px_rgba(15,14,13,0.06)]"
                : "font-normal text-muted hover:text-fg",
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
              "min-h-11 rounded-sm border px-4 py-3.5 text-start transition-colors duration-150",
              selectedId === f.id
                ? "border-fg bg-elevated"
                : "border-border bg-bg hover:border-n300 hover:bg-elevated",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-fg">
              <FileText className="size-3.5 shrink-0 text-n400" aria-hidden="true" />
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
        ? "text-fg"
        : "text-warn";
  const trackBorder =
    cls.track === "criminal"
      ? "border-s-4 border-s-danger"
      : cls.track === "civil"
        ? "border-s-4 border-s-fg"
        : "border-s-4 border-s-warn";
  return (
    <article className={cn("space-y-6 rounded-sm border border-border bg-bg p-6", trackBorder)}>
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
            اطمینان تشخیص: {cls.confidence === "high" ? "بالا" : cls.confidence === "medium" ? "متوسط" : "نامشخص"} · ثبت: {cls.form.fileVia}
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
                className="control-h rounded-sm border border-border bg-elevated-2 px-3.5 text-xs font-medium text-fg transition-colors hover:border-fg"
              >
                {f.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ol className="grid gap-2">
        {cls.nextSteps.map((s, i) => (
          <li key={s.title} className="rounded-sm bg-elevated px-4 py-3">
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
        <Button type="button" variant="premium" onClick={onContinue} className="flex-1">
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
        ? "text-fg"
        : "text-warn";
  const trackBorder =
    c.track === "criminal"
      ? "border-s-4 border-s-danger"
      : c.track === "civil"
        ? "border-s-4 border-s-fg"
        : "border-s-4 border-s-warn";
  return (
    <article className={cn("space-y-5 rounded-sm border border-border bg-bg p-6", trackBorder)}>
      <div>
        <p className={cn("text-sm font-semibold", trackColor)}>مسیر: {c.trackLabel}</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {c.formTitle}
          <span className="text-subtle"> · </span>
          {c.forum}
        </p>
        {c.advice ? <p className="mt-1 text-sm leading-6 text-muted">{c.advice}</p> : null}
      </div>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-sm border border-border bg-elevated-2 px-5 py-4 text-sm leading-8 text-fg">
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
              className="rounded-sm border border-border bg-elevated-2 px-4 py-3 text-xs leading-6 text-muted"
            >
              <p>
                منبع {i + 1} ({s.authorityShort}):{" "}
                {s.source_url ? (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-inline font-medium"
                  >
                    {s.source_title}
                    {s.article_number ? ` — ماده ${s.article_number}` : ""}
                  </a>
                ) : (
                  <>
                    {s.source_title}
                    {s.article_number ? ` — ماده ${s.article_number}` : ""}
                  </>
                )}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-subtle">{s.authorityLabel}</p>
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
