import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MarketingHeader, PrimaryCta } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { ProductFrame } from "@/components/marketing/product-frame";
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
      byDataset: {} as Record<string, number>,
      backend: "unknown",
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

const AUDIENCES = [
  {
    to: "/ask" as const,
    title: "وکلا و کارآموزان",
    desc: "بازیابی ماده‌به‌ماده از قانون اساسی، قوانین عادی، آیین‌نامه، رأی وحدت رویه و نظریات مشورتی — با تمایز الزام‌آوری.",
    shot: undefined as string | undefined,
    label: "نمای پاسخ با فهرست مواد مستند",
  },
  {
    to: "/residency" as const,
    title: "متقاضیان اقامت اروپا و آمریکا",
    desc: "بر پایه‌ی اسناد رسمی eCFR، Federal Register، CourtListener و EUR-Lex، بر اساس کشور مورد نظر شما.",
    shot: undefined as string | undefined,
    label: "نمای گفت‌وگوی اقامتی",
  },
  {
    to: "/forms" as const,
    title: "تنظیم اوراق دادرسی",
    desc: "شرح ماجرا را بنویسید؛ مسیر حقوقی یا کیفری تشخیص داده می‌شود و پیش‌نویس با مواد بازیابی‌شده تنظیم می‌گردد.",
    shot: undefined as string | undefined,
    label: "نمای پیش‌نویس شکواییه",
  },
];

const CAPABILITIES = [
  {
    title: "تطبیق ماده‌ی دقیق",
    desc: "شماره‌ی ماده یا اصل را بنویسید؛ همان متن عیناً بازیابی می‌شود — نه چیزی شبیه آن.",
    label: "تطبیق مستقیم شماره‌ی ماده",
    shot: undefined as string | undefined,
  },
  {
    title: "جست‌وجوی متنی و معنایی",
    desc: "جست‌وجوی تمام‌متن و بازیابی برداری، با رتبه‌بندی بر اساس الزام‌آوری منبع.",
    label: "رتبه‌بندی نتایج بر پایه‌ی الزام‌آوری",
    shot: undefined as string | undefined,
  },
  {
    title: "راستی‌آزمایی استناد",
    desc: "هر ماده‌ای که در پاسخ بیاید با متن بازیابی‌شده مقابله می‌شود؛ استناد تأییدنشده علامت می‌خورد.",
    label: "نشانه‌گذاری استناد تأییدنشده",
    shot: undefined as string | undefined,
  },
  {
    title: "پرونده به‌عنوان شیء کاری",
    desc: "پرونده جدا از پرسش نگهداری می‌شود. فقط بند مرتبط بازیابی می‌گردد؛ کل متن به مدل ریخته نمی‌شود.",
    label: "نمای پرونده و بندهای مرتبط",
    shot: undefined as string | undefined,
  },
  {
    title: "مسیر بازیابی، آشکار",
    desc: "هر پاسخ با فهرست منابع، نوع تطبیق و شناسه‌ی ممازی برمی‌گردد.",
    label: "فهرست منابع و شناسه‌ی ممازی",
    shot: undefined as string | undefined,
  },
];

function LandingPage() {
  const stats = Route.useLoaderData();

  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader active="home" />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-12 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="text-[12px] font-semibold tracking-[0.18em] text-site-500">
                {BRAND.name}
              </p>
              <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.18] tracking-[-0.01em] text-site-950">
                پاسخ حقوقی، مستند به متن قانون.
                <br />
                نه حدس، نه درصد شباهت.
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
                  className="group inline-flex min-h-11 items-center gap-2 border-b border-site-300 text-[14px] font-medium text-site-950 transition-colors hover:border-site-950"
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

          <ProductFrame
            className="mt-14 lg:mt-20"
            priority
            alt="نمای پرسش حقوقی اها: پاسخ همراه با فهرست مواد مستند و شناسه‌ی ممازی"
            label="اسکرین‌شات صفحه‌ی پرسش حقوقی اینجا می‌نشیند"
            ratio="16 / 9"
          />
        </section>

        <section
          className="border-y border-site-200 bg-site-100"
          aria-labelledby="corpus-heading"
        >
          <div className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-10 lg:py-20">
            <h2 id="corpus-heading" className="sr-only">
              اندازه‌ی پیکره
            </h2>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <p className="text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.02em] text-site-950">
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
                    <dd className="mt-1 text-[24px] font-semibold text-site-950">
                      {stats.embedded > 0 ? fa.format(stats.embedded) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-site-500">قابل جست‌وجوی متنی</dt>
                    <dd className="mt-1 text-[24px] font-semibold text-site-950">
                      {stats.searchable > 0 ? fa.format(stats.searchable) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-site-500">منبع رسمی</dt>
                    <dd className="mt-1 text-[24px] font-semibold text-site-950">
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
            className="max-w-xl text-[32px] font-semibold leading-[1.25] tracking-[-0.01em] text-site-950"
          >
            برای کدام کار آمده‌اید؟
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex flex-col rounded-site border border-site-200 bg-site-50 p-6 transition-colors hover:border-site-400"
              >
                <ProductFrame
                  src={a.shot}
                  alt={`${a.title} — نمای محصول`}
                  label={a.label}
                  ratio="4 / 3"
                />
                <h3 className="mt-6 flex items-center gap-2 text-[18px] font-semibold text-site-950">
                  {a.title}
                  <ArrowLeft
                    className="size-4 shrink-0 text-site-400 transition-transform duration-150 group-hover:-translate-x-1 group-hover:text-site-950"
                    aria-hidden="true"
                  />
                </h3>
                <p className="mt-2 text-[14px] leading-[1.75] text-site-600">{a.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="border-y border-site-200 bg-site-100"
          aria-labelledby="capabilities-heading"
        >
          <div className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-10 lg:py-24">
            <h2
              id="capabilities-heading"
              className="max-w-xl text-[32px] font-semibold leading-[1.25] tracking-[-0.01em] text-site-950"
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
              <p className="text-[clamp(1.375rem,3vw,1.75rem)] font-normal leading-[1.6] text-site-950">
                پاسخی که منبعش قابل بررسی نباشد، در کار حقوقی ارزشی ندارد. بنای
                اها بر همین است: هر جمله‌ای که می‌گوید، باید بتوان به متن قانون
                بازگرداند.
              </p>
            </blockquote>
            <figcaption className="lg:col-span-4 lg:self-end">
              <p className="text-[16px] font-semibold text-site-950">
                دکتر سیداکبر موسوی
              </p>
              <p className="mt-1 text-[14px] leading-[1.7] text-site-600">
                وکیل پایه‌یک دادگستری، عضو کانون وکلای مرکز — ناظر حقوقی اها
              </p>
            </figcaption>
          </figure>
        </section>

        <section className="border-t border-site-200 bg-site-950">
          <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-16 lg:grid-cols-12 lg:px-10 lg:py-20">
            <div className="lg:col-span-8">
              <h2 className="text-[24px] font-semibold leading-[1.35] text-site-50">
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
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-site border border-site-700 px-5 text-[14px] font-medium text-site-50 transition-colors hover:border-site-400"
              >
                تماس با ما
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-6 py-16 text-center lg:px-10 lg:py-24">
          <h2 className="mx-auto max-w-2xl text-[32px] font-semibold leading-[1.25] tracking-[-0.01em] text-site-950">
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
                  "group border-t border-site-200 py-5 text-start transition-colors first:border-t-0",
                  isActive ? "text-site-950" : "text-site-600 hover:text-site-950",
                )}
              >
                <span className="flex items-center gap-2 text-[17px] font-semibold">
                  {c.title}
                  <ArrowLeft
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-150",
                      isActive
                        ? "-translate-x-1 text-site-950"
                        : "text-site-400 group-hover:-translate-x-1",
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
          <ProductFrame
            src={current.shot}
            alt={`${current.title} — نمای محصول`}
            label={current.label}
            ratio="16 / 10"
          />
        </div>
      </div>
    </div>
  );
}
