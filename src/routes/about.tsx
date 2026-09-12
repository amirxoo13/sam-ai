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
            SAM AI مؤسسهٔ حقوقی دیجیتال است: پرسش شما با شماره ماده، نام قانون
            و متن رسمی مقابله می‌شود. آنچه در پیکره نیست ساخته نمی‌شود. لحن
            پاسخ، لحن دفتر وکالت است؛ خطاب «شما».
          </p>
          <p>
            دو بخش اصلی دارد: پرسش حقوقی ایران (قانون اساسی، قوانین عادی،
            آیین‌نامه، رأی وحدت رویه، حکم شعبه و نظریه مشورتی — با تفکیک
            الزام‌آوری) و پرسش اقامت اروپا و آمریکا (eCFR، Federal Register،
            CourtListener، EUR-Lex). هر پاسخ با ارجاع قابل کلیک به نشانی رسمی
            همراه است، مشروط بر اینکه نشانی http(s) واقعی در منبع باشد.
          </p>
          <p>
            SAM AI زیر نظر <span className="text-fg">دکتر سیداکبر موسوی</span>،
            وکیل پایه‌یک دادگستری و عضو کانون وکلای مرکز، توسعه یافته است.
          </p>
          <p className="rounded-xl border border-border bg-elevated-2 p-4 text-[13px] text-subtle">
            این سامانه مشاورهٔ حقوقی محسوب نمی‌شود و رابطهٔ وکیل–موکل ایجاد
            نمی‌کند. هویت اشخاص حقیقی پرونده‌های قضایی از پیکره حذف شده است.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
