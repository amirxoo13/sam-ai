import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  FileText,
  Gavel,
  Scale,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import { getCorpusStats } from "@/lib/legal/ask.functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({
  /**
   * آمار پیکره روی خودِ صفحهٔ خانه خوانده می‌شود.
   *
   * چرا: یک عدد بزرگ و قابل راستی‌آزمایی باید *پیش از* توضیح تفصیلی
   * قابلیت‌ها بیاید — این همان کاری است که اعتبار می‌سازد. عدد از همان
   * تابعی می‌آید که صفحهٔ /sources استفاده می‌کند، نه از یک ثابت
   * دست‌نویس. اگر خواندن آمار شکست بخورد یا پیکره خالی باشد، بلوک آمار
   * اصلاً رندر نمی‌شود — عدد ساختگی جای عدد واقعی نمی‌نشیند.
   */
  loader: async () => ({
    stats: await getCorpusStats().catch(() => ({
      total: 0,
      embedded: 0,
      searchable: 0,
      byType: {} as Record<string, number>,
      byDataset: {} as Record<string, number>,
      backend: "unknown",
    })),
  }),
  component: LandingPage,
});

const PRIMARY_CTA =
  "control-h-lg inline-flex w-full items-center justify-center gap-2 rounded-sm bg-fg px-6 text-[14px] font-medium text-bg transition-colors hover:bg-n800 sm:w-auto";

/** اقدام فرعی: افوردنس صریح (خط زیرین + فلش)، اما وزن بصری کمتر. */
const SECONDARY_CTA =
  "control-h-lg group inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-2 text-[14px] font-medium text-fg underline decoration-n300 underline-offset-[6px] transition-colors hover:decoration-fg sm:w-auto";

/**
 * منابعی که واقعاً در پروژه استفاده می‌شوند — نه فهرست تزئینی.
 * qavanin.ir و rc.majlis.ir در SEED_SOURCES کرالر هستند
 * (src/lib/crawler/run.server.ts) و بقیه در پیکرهٔ اقامت.
 */
const SOURCE_STRIP = [
  "qavanin.ir",
  "rc.majlis.ir",
  "آرای وحدت رویه",
  "نظریات مشورتی",
  "eCFR",
  "EUR-Lex",
  "CourtListener",
];

/** دو مخاطب واقعی محصول. هرکدام صفحهٔ اختصاصی خودش را دارد. */
const SEGMENTS = [
  {
    icon: <Gavel className="size-4" aria-hidden="true" />,
    eyebrow: "حقوق ایران",
    title: "پرسش حقوقی، با ارجاع به مادهٔ دقیق",
    desc: "بازیابی ماده‌به‌ماده از قانون اساسی، قوانین عادی، آیین‌نامه، رأی وحدت رویه و نظریات مشورتی — با تفکیک الزام‌آوری هر منبع.",
    to: "/ask" as const,
  },
  {
    icon: <ShieldCheck className="size-4" aria-hidden="true" />,
    eyebrow: "اروپا و آمریکا",
    title: "پرسش اقامتی، بر پایهٔ اسناد رسمی",
    desc: "پاسخ بر اساس متن eCFR، Federal Register، CourtListener و EUR-Lex، محدود به کشوری که خودتان انتخاب می‌کنید.",
    to: "/residency" as const,
  },
];

/** قابلیت‌های واقعی موجود در پروژه. هیچ موردی که route نداشته باشد اینجا نیست. */
const CAPABILITIES = [
  {
    icon: <FileText className="size-4" aria-hidden="true" />,
    title: "تنظیم شکواییه، دادخواست و لایحه",
    desc: "شرح ماجرا را بنویسید؛ مسیر حقوقی یا کیفری تشخیص داده می‌شود و پیش‌نویس با مواد بازیابی‌شده تنظیم می‌گردد.",
    to: "/forms" as const,
  },
  {
    icon: <Scale className="size-4" aria-hidden="true" />,
    title: "پرونده به‌عنوان شیء کاری",
    desc: "پرونده جدا از پرسش نگهداری می‌شود. فقط بند مرتبط بازیابی می‌گردد؛ کل متن به مدل ریخته نمی‌شود.",
    to: "/profile" as const,
  },
  {
    icon: <BookOpenCheck className="size-4" aria-hidden="true" />,
    title: "منابع و روش‌شناسی باز",
    desc: "فهرست کامل پیکره، وضعیت کرال‌کننده و شیوهٔ رتبه‌بندی منابع، بدون پنهان‌کاری.",
    to: "/sources" as const,
  },
];

/** سه مرحلهٔ واقعیِ retrieveChunks() در src/lib/legal/retrieve.server.ts */
const PIPELINE = [
  {
    icon: <ScanSearch className="size-4" aria-hidden="true" />,
    step: "۰۱",
    title: "تطبیق مادهٔ دقیق",
    desc: "اگر شمارهٔ ماده یا اصل را بنویسید، اول همان متن عیناً از پیکره بازیابی می‌شود — نه چیزی شبیه آن.",
  },
  {
    icon: <BookOpenCheck className="size-4" aria-hidden="true" />,
    step: "۰۲",
    title: "جست‌وجوی متنی و معنایی",
    desc: "سپس جست‌وجوی تمام‌متن و در صورت وجود، بازیابی برداری. نتیجه‌ها بر اساس الزام‌آوری منبع رتبه‌بندی می‌شوند.",
  },
  {
    icon: <ShieldCheck className="size-4" aria-hidden="true" />,
    step: "۰۳",
    title: "راستی‌آزمایی استناد",
    desc: "هر ماده‌ای که در پاسخ ذکر شود با متن منابع بازیابی‌شده مقابله می‌شود؛ استناد تأییدنشده صریحاً علامت می‌خورد.",
  },
];

function fa(n: number): string {
  return n.toLocaleString("fa-IR");
}

function LandingPage() {
  const { user } = useCurrentUserState();
  const { stats } = Route.useLoaderData();

  const ctaTo = user ? "/ask" : "/login";
  const ctaSearch = user ? undefined : { next: "/ask" };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="home" />

      <main id="main" className="flex-1">
        {/* ═══════════════════════════════════════════════════════ HERO
            چیدمان نامتقارن: تیتر در یک سمت، توضیح کوتاه و تنها اقدام
            اصلی در سمت دیگر — نه الگوی متقارنِ «تیتر، زیرتیتر، دکمه،
            وسط‌چین». */}
        <section className="container-wide pt-10 pb-14 sm:pt-16 lg:pt-24 lg:pb-20">
          <div className="grid items-end gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <p className="t-eyebrow">{BRAND.name}</p>
              <h1 className="t-display mt-4 text-fg">
                پاسخ حقوقی، مستند به متن قانون.
                <span className="mt-1 block text-n400">نه حدس، نه درصد شباهت.</span>
              </h1>
            </div>

            <div className="lg:col-span-5 lg:pb-2">
              <p className="t-body max-w-md text-muted">
                پرسش شما نخست با شمارهٔ ماده و نام قانون، سپس با جست‌وجوی متنی و
                برداری، در پیکرهٔ قوانین و آرای ایران جست‌وجو می‌شود و پاسخ فقط
                بر همان متن بنا می‌شود. آنچه در منبع نیست، گفته نمی‌شود.
              </p>
              <div className="mt-7 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Link to={ctaTo} search={ctaSearch} className={PRIMARY_CTA}>
                  {BRAND.cta}
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
                <Link to="/sources" className={SECONDARY_CTA}>
                  منابع و روش‌شناسی
                  <ArrowLeft
                    className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────── عدد واقعی، پیش از شرح
              فقط وقتی رندر می‌شود که پیکره واقعاً خوانده شده باشد. */}
          {stats.total > 0 ? (
            <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border pt-10 lg:mt-24 lg:grid-cols-4">
              <Stat value={fa(stats.total)} label="قطعهٔ متن قانون و رأی در پیکره" />
              {stats.embedded > 0 ? (
                <Stat value={fa(stats.embedded)} label="قطعه با بردار معنایی کامل" />
              ) : null}
              {(stats.byType.statute ?? 0) > 0 ? (
                <Stat value={fa(stats.byType.statute ?? 0)} label="مادهٔ قانون موضوعه" />
              ) : null}
              {(stats.byType.case_law ?? 0) > 0 ? (
                <Stat value={fa(stats.byType.case_law ?? 0)} label="رأی و رویهٔ قضایی" />
              ) : null}
            </dl>
          ) : null}
        </section>

        {/* ══════════════════════════════════════════ نوار منابع (اعتبار) */}
        <section className="border-y border-border bg-n100" aria-labelledby="sources-strip">
          <div className="container-wide py-7">
            <h2 id="sources-strip" className="t-caption text-center font-medium text-subtle">
              بر پایهٔ متون رسمی
            </h2>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {SOURCE_STRIP.map((s) => (
                <li key={s} className="text-[13px] font-medium text-subtle" dir="auto">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ دو مخاطب اصلی */}
        <section className="container-wide py-16 lg:py-24" aria-labelledby="segments-heading">
          <div className="max-w-2xl">
            <p className="t-eyebrow">برای چه کسی</p>
            <h2 id="segments-heading" className="t-h2 mt-3 text-fg">
              دو پیکرهٔ جدا، دو مسیر پاسخ جدا.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {SEGMENTS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="group flex flex-col rounded-xl border border-border bg-elevated-2 p-7 transition-colors hover:border-n300 sm:p-9"
              >
                <span className="flex size-9 items-center justify-center rounded-sm border border-border text-fg">
                  {s.icon}
                </span>
                <p className="t-caption mt-6 font-medium text-subtle">{s.eyebrow}</p>
                <h3 className="t-h3 mt-1.5 text-fg">{s.title}</h3>
                <p className="t-small mt-3 flex-1 text-muted">{s.desc}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-fg underline decoration-n300 underline-offset-[6px] transition-colors group-hover:decoration-fg">
                  {BRAND.cta}
                  <ArrowLeft
                    className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════ فهرست قابلیت‌ها */}
        <section
          className="border-t border-border bg-n100"
          aria-labelledby="capabilities-heading"
        >
          <div className="container-wide grid gap-10 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
            <div className="lg:col-span-4">
              <p className="t-eyebrow">قابلیت‌ها</p>
              <h2 id="capabilities-heading" className="t-h2 mt-3 text-fg">
                چه کاری می‌توانید انجام دهید
              </h2>
              <p className="t-small mt-4 max-w-sm text-muted">
                هر مورد یک صفحهٔ واقعی در همین سامانه است — نه فهرست وعده.
              </p>
            </div>

            <ul className="lg:col-span-8">
              {CAPABILITIES.map((c) => (
                <li key={c.to} className="border-b border-border first:border-t">
                  <Link
                    to={c.to}
                    className="group flex items-start gap-5 py-7 transition-colors hover:bg-elevated/60"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-elevated-2 text-fg">
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-h3 block text-fg">{c.title}</span>
                      <span className="t-small mt-1.5 block text-muted">{c.desc}</span>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg underline decoration-n300 underline-offset-[6px] transition-colors group-hover:decoration-fg">
                        مشاهده
                        <ArrowLeft
                          className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ مسیر رسیدن به پاسخ */}
        <section className="container-wide py-16 lg:py-24" aria-labelledby="pipeline-heading">
          <div className="max-w-2xl">
            <p className="t-eyebrow">روش کار</p>
            <h2 id="pipeline-heading" className="t-h2 mt-3 text-fg">
              چگونه به پاسخ می‌رسد
            </h2>
            <p className="t-small mt-4 max-w-lg text-muted">
              مسیر بازیابی پنهان نیست. هر پاسخ با فهرست منابع، نوع تطبیق و شناسهٔ
              ممیزی برمی‌گردد.
            </p>
          </div>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {PIPELINE.map((s) => (
              <li key={s.step} className="bg-elevated-2 p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-sm border border-border text-fg">
                    {s.icon}
                  </span>
                  <span className="text-[13px] font-medium text-n300" aria-hidden="true">
                    {s.step}
                  </span>
                </div>
                <h3 className="t-h3 mt-6 text-fg">{s.title}</h3>
                <p className="t-small mt-2 text-muted">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ══════════════════════════════════════════════ بند پایانی + CTA
            هدر روی این بخش هم می‌نشیند؛ چون پس‌زمینه جوهری است و هدر پس
            از اسکرول عاجیِ نیمه‌شفاف می‌شود، تضاد حفظ می‌شود. */}
        <section className="bg-n950 text-n50">
          <div className="container-wide grid gap-8 py-16 lg:grid-cols-12 lg:items-end lg:py-20">
            <div className="lg:col-span-7">
              <h2 className="t-h2">این سامانه جایگزین وکیل نیست</h2>
              <p className="t-small mt-4 max-w-xl text-n300">
                {BRAND.name} جایگزین مشاورهٔ حقوقی و رابطهٔ وکیل–موکل نیست. برای
                بررسی پرونده، می‌توانید با دفتر مؤسسه تماس بگیرید.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:col-span-5 lg:justify-end">
              <Link
                to={ctaTo}
                search={ctaSearch}
                className="control-h-lg inline-flex items-center justify-center gap-2 rounded-sm bg-n50 px-6 text-[14px] font-medium text-n950 transition-colors hover:bg-n200"
              >
                {BRAND.cta}
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="control-h-lg inline-flex items-center justify-center rounded-sm border border-n700 px-6 text-[14px] font-medium text-n50 transition-colors hover:border-n400"
              >
                تماس با ما
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-none tracking-[-0.02em] text-fg tabular-nums">
          {value}
        </span>
        <span className="t-caption mt-2.5 block max-w-[14rem] text-muted">{label}</span>
      </dd>
    </div>
  );
}
