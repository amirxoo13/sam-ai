import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Gavel, Scale, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { user, isPending } = useCurrentUserState();
  const primaryCta = isPending ? "/ask" : user ? "/ask" : "/login";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="home" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:py-16">
        <section className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[12px] font-bold tracking-[0.18em] text-accent uppercase">
            Smart Attorney Mind
          </p>
          <h1 className="text-[30px] font-extrabold leading-[1.35] tracking-tight sm:text-[38px]">
            دستیار حقوقی و اقامتی هوشمند —
            <br />
            <span className="text-cyan">پاسخ با ارجاع به منبع</span>، نه حدس.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-8 text-muted">
            SAM AI سؤال شما را در متن قانون، آرای قضایی و اسناد رسمی
            جست‌وجو می‌کند و فقط بر اساس همان متن پاسخ می‌دهد — چیزی را که
            نمی‌داند، صادقانه می‌گوید نمی‌داند.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={primaryCta}
              className="w-full rounded-xl px-7 py-3.5 text-[14.5px] font-bold text-[#1a1305] sm:w-auto"
              style={{
                background:
                  "linear-gradient(135deg,var(--color-accent-light),var(--color-accent) 60%,var(--color-warn))",
              }}
            >
              {user ? "شروع پرسش" : "ساخت حساب رایگان"}
            </Link>
            <Link
              to="/sources"
              className="w-full rounded-xl border border-border px-7 py-3.5 text-[14.5px] font-medium text-fg hover:bg-elevated-2 sm:w-auto"
            >
              منابع و روش‌شناسی
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={<Gavel className="size-5" />}
            title="پرسش‌وپاسخ حقوقی و کیفری ایران"
            desc="بر پایه‌ی قوانین اصلی، قوانین خاص، آرای قضایی واقعی و نظریات مشورتی — با ارجاع دقیق به ماده و منبع."
            to="/ask"
          />
          <FeatureCard
            icon={<ShieldCheck className="size-5" />}
            title="پرسش‌وپاسخ اقامتی اروپا و آمریکا"
            desc="بر پایه‌ی اسناد رسمی eCFR، Federal Register، CourtListener و EUR-Lex، بر اساس کشور موردنظرتان."
            to="/residency"
          />
          <FeatureCard
            icon={<FileText className="size-5" />}
            title="تنظیم شکواییه، دادخواست و لایحه"
            desc="ماجرا را بگویید؛ مسیر حقوقی یا کیفری تشخیص داده می‌شود و پیش‌نویس برگه‌ی رسمی آماده می‌گردد."
            to="/forms"
          />
          <FeatureCard
            icon={<Scale className="size-5" />}
            title="پرونده‌های خصوصی شما"
            desc="پرونده‌های خودتان را در پروفایل کاربری آپلود کنید و در اختیار دستیار حقوقی بگذارید."
            to="/profile"
          />
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-elevated-2 p-6 text-center sm:p-8">
          <p className="mx-auto max-w-xl text-[13.5px] leading-7 text-muted">
            SAM AI جایگزین مشاوره‌ی حقوقی رسمی نیست. برای بررسی دقیق پرونده‌تان،
            می‌توانید مستقیم با تیم حقوقی SAM AI تماس بگیرید.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-block rounded-lg border border-accent/40 px-5 py-2.5 text-[13.5px] font-bold text-accent-light hover:bg-accent/10"
          >
            تماس با ما
          </Link>
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
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-elevated-2 p-5 transition-colors hover:border-accent/40"
    >
      <span
        className="flex size-10 items-center justify-center rounded-xl text-accent"
        style={{ background: "rgba(217,178,92,0.1)" }}
      >
        {icon}
      </span>
      <span className="text-[14.5px] font-bold text-fg">{title}</span>
      <span className="text-[12.5px] leading-6 text-muted">{desc}</span>
    </Link>
  );
}
