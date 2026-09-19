import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import { ArrowLeft } from "lucide-react";
import { MarketingHeader, PrimaryCta } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import {
  AskConversationPreview,
  IndividualAudiencePreview,
  LawyerAudiencePreview,
  ResidencyAudiencePreview,
  CAPABILITY_PREVIEWS,
} from "@/components/marketing/product-previews";
import { getCorpusStats } from "@/lib/legal/ask.functions";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: () =>
    getCorpusStats().catch(() => ({
      total: 0,
      embedded: 0,
      searchable: 0,
      byType: {} as Record<string, number>,
    })),
  component: LandingPage,
});

const fa = new Intl.NumberFormat("fa-IR");

const SOURCE_STRIP = [
  "qavanin.ir",
  "rc.majlis.ir",
  "آرای وحدت رویه",
  "نظریات مشورتی",
  "eCFR",
  "EUR-Lex",
  "CourtListener",
];

const AUDIENCES: {
  to: "/ask" | "/forms" | "/residency";
  title: string;
  scenario: string;
  Preview: ComponentType;
}[] = [
  {
    to: "/ask",
    title: "وکلا و کارآموزان",
    scenario:
      "امشب اصل ۳۵ قانون اساسی را با شمارهٔ اصل می‌پرسید؛ پاسخ همان متن اصل است، با نشان «مادهٔ دقیق · ۱۰۰٪».",
    Preview: LawyerAudiencePreview,
  },
  {
    to: "/forms",
    title: "افراد حقیقی",
    scenario:
      "شرح مهریه یا نفقه را می‌نویسید؛ مسیر حقوقی تشخیص داده می‌شود و پیش‌نویس دادخواست با مواد بازیابی‌شده پر می‌گردد.",
    Preview: IndividualAudiencePreview,
  },
  {
    to: "/residency",
    title: "متقاضیان مهاجرت",
    scenario:
      "سؤال H-1B یا پناهندگی آلمان را با کشور مشخص می‌پرسید؛ پاسخ از eCFR یا EUR-Lex می‌آید، نه از تفسیر عمومی.",
    Preview: ResidencyAudiencePreview,
  },
];

const CAPABILITIES = [
  {
    title: "تطبیق ماده‌ی دقیق",
    desc: "شماره‌ی ماده یا اصل را بنویسید؛ همان متن عیناً بازیابی می‌شود — نه چیزی شبیه آن.",
  },
  {
    title: "جست‌وجوی متنی و معنایی",
    desc: "جست‌وجوی تمام‌متن و بازیابی برداری، با رتبه‌بندی بر اساس الزام‌آوری منبع.",
  },
  {
    title: "راستی‌آزمایی استناد",
    desc: "هر ماده‌ای که در پاسخ بیاید با متن بازیابی‌شده مقابله می‌شود؛ استناد تأییدنشده علامت می‌خورد.",
  },
  {
    title: "پرونده به‌عنوان شیء کاری",
    desc: "پرونده جدا از پرسش نگهداری می‌شود. فقط بند مرتبط بازیابی می‌گردد؛ کل متن به مدل ریخته نمی‌شود.",
  },
  {
    title: "مسیر بازیابی، آشکار",
    desc: "هر پاسخ با فهرست منابع، نوع تطبیق و شناسه‌ی ممیزی برمی‌گردد.",
  },
];

function LandingPage() {
  const stats = Route.useLoaderData();

  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader active="home" />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-10 lg:px-10 lg:pb-24 lg:pt-16">
          <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="text-[12px] font-semibold tracking-[0.18em] text-site-500">
                {BRAND.name}
              </p>
              <h1 className="mt-5 text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-[2.75rem] sm:leading-[1.2] lg:text-[3.5rem] lg:leading-[1.15]">
                پاسخ حقوقی، مستند به متن قانون.
                <span className="mt-2 block">نه حدس، نه درصد شباهت.</span>
              </h1>
            </div>

            <div className="lg:col-span-5">
              <p className="max-w-md text-[16px] leading-[1.75] text-site-600">
                پرسش شما نخست با شماره‌ی ماده و نام قانون، سپس با جست‌وجوی متنی
                و برداری، در پیکره‌ی قوانین و آرای ایران جست‌وجو می‌شود و پاسخ
                فقط بر همان متن بنا می‌شود. آنچه در منبع نیست، گفته نمی‌شود.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                <PrimaryCta />
                <Link
                  to="/sources"
                  className="group inline-flex min-h-11 items-center gap-2 border-b border-site-300 text-[14px] font-medium text-fg transition-colors hover:border-fg"
                >
                  منابع و روش‌شناسی
                  <ArrowLeft
                    className="size-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-14 lg:mt-20">
            <AskConversationPreview />
          </div>
        </section>

        <section
          className="border-y border-border bg-site-100"
          aria-labelledby="corpus-heading"
        >
          <div className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-10 lg:py-20">
            <h2 id="corpus-heading" className="sr-only">
              اندازه‌ی پیکره
            </h2>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <p className="text-[clamp(3rem,7vw,4.5rem)] font-extrabold leading-none tracking-tight text-fg">
                  {stats.total > 0 ? fa.format(stats.total) : "—"}
                </p>
                <p className="mt-4 text-[16px] leading-[1.75] text-site-600">
                  قطعه‌ی حقوقی ایندکس‌شده در پیکره — قانون، آیین‌نامه، رأی وحدت
                  رویه، نظریه‌ی مشورتی و رویه‌ی دادرسی.
                </p>
              </div>
              <div className="lg:col-span-7">
                <dl className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                  <div>
                    <dt className="text-[13px] text-site-500">قطعه‌ی برداری‌شده</dt>
                    <dd className="mt-1 text-[24px] font-extrabold text-fg">
                      {stats.embedded > 0 ? fa.format(stats.embedded) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-site-500">قابل جست‌وجوی متنی</dt>
                    <dd className="mt-1 text-[24px] font-extrabold text-fg">
                      {stats.searchable > 0 ? fa.format(stats.searchable) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-site-500">منبع رسمی</dt>
                    <dd className="mt-1 text-[24px] font-extrabold text-fg">
                      {fa.format(SOURCE_STRIP.length)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-10 text-[12px] font-semibold tracking-[0.18em] text-site-500">
                  بر پایه‌ی متون رسمی
                </p>
                <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {SOURCE_STRIP.map((s) => (
                    <li key={s} className="text-[14px] text-site-600" dir="auto">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-10 lg:py-24"
          aria-labelledby="audiences-heading"
        >
          <h2
            id="audiences-heading"
            className="max-w-xl text-[1.75rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-[2rem] sm:leading-[1.25]"
          >
            برای کدام کار آمده‌اید؟
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex flex-col rounded-[12px] border border-border bg-elevated p-5 transition-colors hover:border-site-400"
              >
                <a.Preview />
                <h3 className="mt-5 flex items-center gap-2 text-[18px] font-extrabold text-fg">
                  {a.title}
                  <ArrowLeft
                    className="size-4 shrink-0 text-site-400 transition-transform duration-150 group-hover:-translate-x-1 group-hover:text-fg"
                    aria-hidden="true"
                  />
                </h3>
                <p className="mt-2 text-[14px] leading-[1.75] text-site-600">{a.scenario}</p>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="border-y border-border bg-site-100"
          aria-labelledby="capabilities-heading"
        >
          <div className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-10 lg:py-24">
            <h2
              id="capabilities-heading"
              className="max-w-xl text-[1.75rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-[2rem] sm:leading-[1.25]"
            >
              مسیر رسیدن به پاسخ پنهان نیست.
            </h2>
            <CapabilityExplorer />
          </div>
        </section>

        <section
          className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-10 lg:py-24"
          aria-labelledby="attribution-heading"
        >
          <h2 id="attribution-heading" className="sr-only">
            نظارت حقوقی
          </h2>
          <figure className="m-0 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <blockquote className="lg:col-span-8">
              <p className="text-[1.375rem] font-bold leading-[1.6] text-fg sm:text-[1.75rem]">
                پاسخی که منبعش قابل بررسی نباشد، در کار حقوقی ارزشی ندارد. بنای
                اها بر همین است: هر جمله‌ای که می‌گوید، باید بتوان به متن قانون
                بازگرداند.
              </p>
            </blockquote>
            <figcaption className="lg:col-span-4 lg:self-end">
              <p className="text-[16px] font-extrabold text-fg">دکتر سیداکبر موسوی</p>
              <p className="mt-1 text-[14px] leading-[1.7] text-site-600">
                وکیل پایه‌یک دادگستری، عضو کانون وکلای مرکز — ناظر حقوقی اها
              </p>
            </figcaption>
          </figure>
        </section>

        <section className="border-t border-border bg-fg">
          <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-16 lg:grid-cols-12 lg:px-10 lg:py-20">
            <div className="lg:col-span-8">
              <h2 className="text-[24px] font-extrabold leading-[1.35] text-bg">
                این سامانه جایگزین وکیل نیست
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-[1.75] text-site-300">
                {BRAND.name} جایگزین مشاوره‌ی حقوقی و رابطه‌ی وکیل–موکل نیست.
                برای بررسی پرونده، می‌توانید با دفتر مؤسسه تماس بگیرید.
              </p>
            </div>
            <div className="flex items-start lg:col-span-4 lg:justify-end">
              <Link
                to="/contact"
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-[8px] border border-site-700 px-5 text-[14px] font-medium text-bg transition-colors hover:border-site-400"
              >
                تماس با ما
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-6 py-16 text-center lg:px-10 lg:py-24">
          <h2 className="mx-auto max-w-2xl text-[1.75rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-[2rem] sm:leading-[1.25]">
            پرسش حقوقی‌تان را با متن قانون بسنجید.
          </h2>
          <div className="mt-8 flex justify-center">
            <PrimaryCta />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function CapabilityExplorer() {
  const [active, setActive] = useState(0);
  const current = CAPABILITIES[active];
  const Preview = CAPABILITY_PREVIEWS[active];

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <div role="tablist" aria-label="قابلیت‌ها" className="flex flex-col">
          {CAPABILITIES.map((c, i) => {
            const isActive = i === active;
            return (
              <button
                key={c.title}
                type="button"
                role="tab"
                id={`cap-tab-${i}`}
                aria-selected={isActive}
                aria-controls="cap-panel"
                onClick={() => setActive(i)}
                className={cn(
                  "group border-t border-border py-5 text-start transition-colors first:border-t-0",
                  isActive ? "text-fg" : "text-site-600 hover:text-fg",
                )}
              >
                <span className="flex items-center gap-2 text-[17px] font-extrabold">
                  {c.title}
                  <ArrowLeft
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-150",
                      isActive ? "-translate-x-1 text-fg" : "text-site-400 group-hover:-translate-x-1",
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1.5 block text-[14px] leading-[1.75] text-site-600">
                  {c.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-7">
        <div
          role="tabpanel"
          id="cap-panel"
          aria-labelledby={`cap-tab-${active}`}
          className="lg:sticky lg:top-28"
        >
          <Preview />
          <p className="mt-3 text-[12.5px] leading-6 text-site-500">
            پیش‌نمایش رابط — {current.title}. دادهٔ زنده نیست.
          </p>
        </div>
      </div>
    </div>
  );
}
