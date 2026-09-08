import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="about" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <p className="mb-2 text-[12px] font-bold tracking-[0.18em] text-accent uppercase">
          درباره ما
        </p>
        <h1 className="text-[26px] font-extrabold leading-[1.4]">
          SAM AI — ذهن هوشمند وکالت
        </h1>
        <div className="mt-6 grid gap-5 text-[14px] leading-8 text-muted">
          <p>
            SAM AI با هدف رفاه‌حال هموطنان عزیزمان طراحی شده است: دستیاری که
            به زبان ساده و صمیمی، بر پایه‌ی متن واقعی قانون و اسناد رسمی —
            نه حدس و گمان — به سؤالات حقوقی، کیفری و اقامتی پاسخ می‌دهد.
          </p>
          <p>
            پلتفرم دو بخش اصلی دارد: پرسش‌وپاسخ حقوقی و کیفری ایران (بر
            پایه‌ی قوانین اصلی، قوانین خاص، آرای قضایی واقعی و نظریات
            مشورتی) و پرسش‌وپاسخ اقامت اروپا و آمریکا (بر پایه‌ی اسناد رسمی
            eCFR، Federal Register، CourtListener و EUR-Lex). هر دو بخش با
            روش بازیابی برداری (RAG) کار می‌کنند: سؤال شما در متون واقعی
            جست‌وجو می‌شود و پاسخ فقط بر همان متن استوار است.
          </p>
          <p>
            SAM AI زیر نظر <span className="text-fg">دکتر سیداکبر موسوی</span>،
            وکیل پایه‌یک دادگستری و عضو کانون وکلای مرکز، توسعه یافته است.
          </p>
          <p className="rounded-xl border border-border bg-elevated-2 p-4 text-[13px] text-subtle">
            SAM AI صرفاً اطلاع‌رسانی است و جایگزین مشاوره‌ی حقوقی رسمی نیست.
            برای بررسی دقیق پرونده‌ی خودتان، حتماً با یک وکیل مشورت کنید.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
