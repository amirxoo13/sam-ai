import { createFileRoute } from "@tanstack/react-router";
import { MarketingHeader, PrimaryCta } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader active="about" />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-10">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.18em] text-site-500">درباره ما</p>
        <h1 className="text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-[2.5rem] sm:leading-[1.2]">
          {BRAND.name}
        </h1>
        <div className="mt-8 grid gap-5 text-[15px] leading-8 text-muted">
          <p>
            {BRAND.name} دستیار حقوقی دیجیتال است: پرسش شما با شماره ماده، نام قانون
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
            {BRAND.short} زیر نظر <span className="font-semibold text-fg">دکتر سیداکبر موسوی</span>،
            وکیل پایه‌یک دادگستری و عضو کانون وکلای مرکز، توسعه یافته است.
          </p>
          <p className="rounded-[12px] border border-border bg-elevated p-4 text-[13.5px] leading-7 text-subtle">
            این سامانه مشاورهٔ حقوقی محسوب نمی‌شود و رابطهٔ وکیل–موکل ایجاد
            نمی‌کند. هویت اشخاص حقیقی پرونده‌های قضایی از پیکره حذف شده است.
          </p>
        </div>
        <div className="mt-10">
          <PrimaryCta />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
