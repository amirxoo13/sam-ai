import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-10">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.18em] text-site-500">اسناد حقوقی</p>
        <h1 className="text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg">
          شرایط استفاده
        </h1>
        <p className="mt-3 text-[13.5px] text-subtle">آخرین به‌روزرسانی: ۱۹ شهریور ۱۴۰۵ (۱۰ سپتامبر ۲۰۲۶)</p>

        <div className="mt-8 grid gap-6 text-[15px] leading-8 text-muted">
          <section>
            <h2 className="text-[17px] font-bold text-fg">۱. ماهیت سامانه</h2>
            <p className="mt-2">
              {BRAND.name} یک سامانهٔ اطلاع‌رسانی و بازیابی متن قوانین، آیین‌نامه‌ها،
              آرای قضایی و اسناد اقامتی است. خروجی سامانه «مشاورهٔ حقوقی» به معنای
              قانون وکالت نیست، رابطهٔ وکیل–موکل ایجاد نمی‌کند و جایگزین مراجعه به
              وکیل دادگستری یا مراجع رسمی جمهوری اسلامی ایران نمی‌شود. قوهٔ قضاییه،
              کانون وکلای دادگستری و هیچ مرجع دولتی این سامانه را تأیید نکرده‌اند.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۲. پذیرش شرایط</h2>
            <p className="mt-2">
              ایجاد حساب، ورود، یا استفاده از پرسش حقوقی، پرسش اقامتی و تنظیم برگه
              به معنای مطالعه و پذیرش همین سند و{" "}
              <Link to="/privacy" className="font-medium text-fg underline-offset-4 hover:underline">
                سیاست حریم خصوصی
              </Link>{" "}
              است. اگر با این شرایط موافق نیستید، از سامانه استفاده نکنید.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۳. حساب کاربری</h2>
            <p className="mt-2">
              برای بخش‌های پرسش و برگه باید با ایمیل و رمز شخصی حساب بسازید. حفظ
              محرمانگی رمز و تمام فعالیت‌های انجام‌شده از حساب بر عهدهٔ شماست.
              ارائهٔ اطلاعات نادرست، ساخت حساب به نام دیگری، یا تلاش برای دسترسی
              غیرمجاز به حساب دیگران ممنوع است و می‌تواند به تعلیق حساب بینجامد.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۴. محدودیت‌های استفاده</h2>
            <p className="mt-2">
              کاربر حق ندارد از سامانه برای ارتکاب جرم، دور زدن قانون، استخراج انبوه
              پیکره، مهندسی معکوس، اختلال در سرویس، یا ارسال هرزنامه استفاده کند.
              پرسش‌ها و پیش‌نویس‌ها صرفاً برای استفادهٔ شخصی یا حرفه‌ایِ محدود است؛
              بازنشر پاسخ به‌عنوان نظر رسمی {BRAND.short} یا دفتر وکالت بدون ذکر
              ماهیت آموزشی آن مجاز نیست.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۵. محتوا و مسئولیت</h2>
            <p className="mt-2">
              بازیابی بر اساس پیکرهٔ موجود انجام می‌شود. قوانین و آرا ممکن است نسخ،
              اصلاح یا تفسیر جدید داشته باشند. مهلت‌های قانونی، صلاحیت دادگاه، و
              ارزیابی ادله را خود محاسبه یا به وکیل نسپارید مگر با بررسی مستقل.
              {BRAND.short} در قبال خسارت ناشی از اتکا به پاسخ — از جمله از دست رفتن
              مهلت دادرسی — مسئولیتی ندارد، جز در مواردی که قانون آمرهٔ ایران خلاف آن
              را مقرر کند.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۶. پیش‌نویس برگه‌ها</h2>
            <p className="mt-2">
              پیش‌نویس دادخواست و لوایح آموزشی است و برای ثبت در سامانهٔ ثنا یا
              تقدیم به مرجع قضایی به‌تنهایی کافی نیست. پیش از امضا باید با وکیل
              دادگستری و متن قانون مقابله شود.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۷. مالکیت فکری</h2>
            <p className="mt-2">
              نرم‌افزار، طراحی و نام {BRAND.short} متعلق به گردانندهٔ سامانه است.
              متون قوانین و آرا در مالکیت عمومی یا متعلق به ناشر رسمی‌اند و نقل آن‌ها
              با ارجاع به منبع انجام می‌شود. پرسش‌هایی که می‌نویسید برای ارائهٔ خدمت
              پردازش می‌شوند؛ این به معنای انتقال مالکیت فکری پرسش شما نیست.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۸. قانون حاکم</h2>
            <p className="mt-2">
              این شرایط تابع قوانین جمهوری اسلامی ایران است؛ از جمله قانون تجارت
              الکترونیکی، قانون جرایم رایانه‌ای، و مقررات مربوط به حمایت از حقوق
              مصرف‌کننده در فضای مجازی. مرجع صالح برای اختلاف، دادگاه‌های عمومی
              حقوقی تهران است مگر قانون ترتیب دیگری مقرر کند.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۹. تماس</h2>
            <p className="mt-2">
              برای پرسش دربارهٔ این شرایط از{" "}
              <Link to="/contact" className="font-medium text-fg underline-offset-4 hover:underline">
                فرم تماس
              </Link>{" "}
              یا نشانی akbarmousavi1356@gmail.com استفاده کنید.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
