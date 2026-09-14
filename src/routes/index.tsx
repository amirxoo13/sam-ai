import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  FileText,
  Gavel,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const GOLD_CTA =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-gold)] px-7 text-[15px] font-bold text-accent-fg transition-[filter] hover:brightness-[1.06] sm:w-auto";

const GHOST_CTA =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface/60 px-7 text-[15px] font-medium text-fg transition-colors hover:border-accent/40 hover:bg-elevated-2 sm:w-auto";

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

/** سه مرحلهٔ واقعیِ retrieveChunks() در src/lib/legal/retrieve.server.ts */
const PIPELINE = [
  {
    icon: <ScanSearch className="size-5" aria-hidden="true" />,
    step: "۰۱",
    title: "تطبیق مادهٔ دقیق",
    desc: "اگر شمارهٔ ماده یا اصل را بنویسید، اول همان متن عیناً از پیکره بازیابی می‌شود — نه چیزی شبیه آن.",
  },
  {
    icon: <BookOpenCheck className="size-5" aria-hidden="true" />,
    step: "۰۲",
    title: "جست‌وجوی متنی و معنایی",
    desc: "سپس جست‌وجوی تمام‌متن و در صورت وجود، بازیابی برداری. نتیجه‌ها بر اساس الزام‌آوری منبع رتبه‌بندی می‌شوند.",
  },
  {
    icon: <ShieldCheck className="size-5" aria-hidden="true" />,
    step: "۰۳",
    title: "راستی‌آزمایی استناد",
    desc: "هر ماده‌ای که در پاسخ ذکر شود با متن منابع بازیابی‌شده مقابله می‌شود؛ استناد تأییدنشده صریحاً علامت می‌خورد.",
  },
];

function LandingPage() {
  const { user } = useCurrentUserState();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="home" />

      <main id="main" className="flex-1">
        {/* ---------------------------------------------------------- HERO */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-14 pt-12 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3.5 py-1.5 text-[12px] font-bold text-accent-light">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {BRAND.name}
            </span>

            <h1 className="mt-6 text-[clamp(1.9rem,6vw,3.25rem)] font-extrabold leading-[1.28] tracking-tight text-fg">
              پاسخ حقوقی، مستند به متن قانون.
              <span className="mt-2 block bg-[image:var(--gradient-gold)] bg-clip-text text-transparent">
                نه حدس، نه درصد شباهت.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-9 text-muted">
              پرسش شما نخست با شمارهٔ ماده و نام قانون، سپس با جست‌وجوی متنی و
              برداری، در پیکرهٔ قوانین و آرای ایران جست‌وجو می‌شود و پاسخ فقط بر
              همان متن بنا می‌شود. آنچه در منبع نیست، گفته نمی‌شود.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <Link to="/ask" className={GOLD_CTA}>
                  ورود به پرسش حقوقی
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link to="/login" search={{ next: "/ask" }} className={GOLD_CTA}>
                  شروع کنید
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
              )}
              <Link to="/sources" className={GHOST_CTA}>
                منابع و روش‌شناسی
              </Link>
            </div>
          </div>

          {/* نوار منابع — همه واقعی و در کد موجودند. */}
          <div className="mt-14 border-y border-border-soft py-5">
            <p className="mb-3 text-center text-[11px] font-bold tracking-[0.2em] text-subtle uppercase">
              بر پایهٔ متون رسمی
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {SOURCE_STRIP.map((s) => (
                <li key={s} className="text-[13px] font-medium text-muted" dir="auto">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------ CAPABILITIES */}
        <section
          className="mx-auto w-full max-w-5xl px-4 pb-16"
          aria-labelledby="features-heading"
        >
          <h2
            id="features-heading"
            className="mb-6 text-center text-[22px] font-extrabold tracking-tight text-fg sm:text-[26px]"
          >
            چه کاری می‌توانید انجام دهید
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<Gavel className="size-5" aria-hidden="true" />}
              title="پرسش حقوقی ایران"
              desc="بازیابی ماده‌به‌ماده از قانون اساسی، قوانین عادی، آیین‌نامه، رأی وحدت رویه و نظریات مشورتی — با تمایز الزام‌آوری."
              to="/ask"
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" aria-hidden="true" />}
              title="پرسش اقامتی اروپا و آمریکا"
              desc="بر پایهٔ اسناد رسمی eCFR، Federal Register، CourtListener و EUR-Lex، بر اساس کشور مورد نظر شما."
              to="/residency"
            />
            <FeatureCard
              icon={<FileText className="size-5" aria-hidden="true" />}
              title="تنظیم شکواییه، دادخواست و لایحه"
              desc="شرح را بنویسید؛ مسیر حقوقی یا کیفری تشخیص داده می‌شود و پیش‌نویس با مواد بازیابی‌شده تنظیم می‌گردد."
              to="/forms"
            />
            <FeatureCard
              icon={<Scale className="size-5" aria-hidden="true" />}
              title="پرونده به‌عنوان شیء کاری"
              desc="پرونده جدا از پرسش نگهداری می‌شود. فقط بند مرتبط بازیابی می‌گردد؛ کل متن به مدل ریخته نمی‌شود."
              to="/profile"
            />
          </div>
        </section>

        {/* --------------------------------------------------------- PIPELINE */}
        <section
          className="border-y border-border-soft bg-surface/40"
          aria-labelledby="pipeline-heading"
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-16">
            <h2
              id="pipeline-heading"
              className="text-center text-[22px] font-extrabold tracking-tight text-fg sm:text-[26px]"
            >
              چگونه به پاسخ می‌رسد
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[13.5px] leading-7 text-muted">
              مسیر بازیابی پنهان نیست. هر پاسخ با فهرست منابع، نوع تطبیق و
              شناسهٔ ممیزی برمی‌گردد.
            </p>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {PIPELINE.map((s) => (
                <li
                  key={s.step}
                  className="rounded-2xl border border-border bg-elevated-2 p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      {s.icon}
                    </span>
                    <span
                      className="text-[13px] font-bold text-subtle"
                      aria-hidden="true"
                    >
                      {s.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-fg">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-7 text-muted">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- DISCLAIMER */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16">
          <div className="rounded-2xl border border-border bg-elevated-2 p-7 text-center sm:p-10">
            <h2 className="text-[17px] font-bold text-fg">
              این سامانه جایگزین وکیل نیست
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[13.5px] leading-8 text-muted">
              {BRAND.name} جایگزین مشاورهٔ حقوقی و رابطهٔ وکیل–موکل نیست. برای
              بررسی پرونده، می‌توانید با دفتر مؤسسه تماس بگیرید.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-accent/40 px-6 text-[13.5px] font-bold text-accent-light transition-colors hover:bg-accent/10"
            >
              تماس با ما
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: "/" | "/ask" | "/forms" | "/residency" | "/profile" | "/sources";
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-elevated-2 p-6 transition-colors hover:border-accent/40 hover:bg-elevated"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="flex items-center gap-2 text-[15px] font-bold text-fg">
        {title}
        {/* فلش در RTL باید به چپ برود؛ در حالت hover کمی جلوتر می‌رود. */}
        <ArrowLeft
          className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:-translate-x-1 group-hover:text-accent"
          aria-hidden="true"
        />
      </span>
      <span className="text-[13px] leading-7 text-muted">{desc}</span>
    </Link>
  );
}
