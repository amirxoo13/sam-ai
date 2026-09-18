import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="about" />
      <main id="main" className="container-prose flex-1 py-14 lg:py-20">
        {/* eyebrow بدون tracking و بدون uppercase — هر دو روی خط فارسی
            غلط‌اند: uppercase بی‌اثر است و letter-spacing اتصال حروف را
            بصری می‌شکند. */}
        <p className="t-eyebrow">درباره ما</p>
        <h1 className="t-h1 mt-3 text-fg">{BRAND.name} — ذهن هوشمند وکالت</h1>

        <div className="mt-8 grid gap-6 border-t border-border pt-8 text-muted">
          <p className="t-body">
            {BRAND.name} مؤسسهٔ حقوقی دیجیتال است: پرسش شما با شماره ماده، نام
            قانون و متن رسمی مقابله می‌شود. آنچه در پیکره نیست ساخته نمی‌شود.
            لحن پاسخ، لحن دفتر وکالت است؛ خطاب «شما».
          </p>
          <p className="t-body">
            دو بخش اصلی دارد: پرسش حقوقی ایران (قانون اساسی، قوانین عادی،
            آیین‌نامه، رأی وحدت رویه، حکم شعبه و نظریه مشورتی — با تفکیک
            الزام‌آوری) و پرسش اقامت اروپا و آمریکا (eCFR، Federal Register،
            CourtListener، EUR-Lex). هر پاسخ با ارجاع قابل کلیک به نشانی رسمی
            همراه است، مشروط بر اینکه نشانی http(s) واقعی در منبع باشد.
          </p>
          <p className="t-body">
            {BRAND.name} زیر نظر{" "}
            <span className="font-medium text-fg">دکتر سیداکبر موسوی</span>، وکیل
            پایه‌یک دادگستری و عضو کانون وکلای مرکز، توسعه یافته است.
          </p>

          {/* بند هشدار: با خط عمودی در لبهٔ شروع مشخص می‌شود، نه با کارت
              رنگی — در پوستهٔ خنثی، تأکید از ساختار می‌آید نه از رنگ. */}
          <p className="t-small border-s-2 border-n300 ps-5 text-subtle">
            این سامانه مشاورهٔ حقوقی محسوب نمی‌شود و رابطهٔ وکیل–موکل ایجاد
            نمی‌کند. هویت اشخاص حقیقی پرونده‌های قضایی از پیکره حذف شده است.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
