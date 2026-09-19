import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-10">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.18em] text-site-500">اسناد حقوقی</p>
        <h1 className="text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg">
          سیاست حریم خصوصی
        </h1>
        <p className="mt-3 text-[13.5px] text-subtle">آخرین به‌روزرسانی: ۱۹ شهریور ۱۴۰۵ (۱۰ سپتامبر ۲۰۲۶)</p>

        <div className="mt-8 grid gap-6 text-[15px] leading-8 text-muted">
          <section>
            <h2 className="text-[17px] font-bold text-fg">۱. مسئول پردازش</h2>
            <p className="mt-2">
              گردانندهٔ {BRAND.name} داده‌های شخصی را برای ارائهٔ همین سامانه پردازش
              می‌کند. تماس: akbarmousavi1356@gmail.com و{" "}
              <Link to="/contact" className="font-medium text-fg underline-offset-4 hover:underline">
                فرم تماس
              </Link>
              .
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۲. داده‌هایی که جمع می‌شود</h2>
            <ul className="mt-2 list-disc pr-6">
              <li>شناسهٔ حساب: نام نمایشی، ایمیل، و هش رمز عبور.</li>
              <li>محتوای خدمت: پرسش‌ها، پیش‌نویس‌ها، و پرونده‌هایی که خودتان ذخیره می‌کنید.</li>
              <li>پیام‌های فرم تماس: نام، ایمیل و متن پیام.</li>
              <li>دادهٔ فنی محدود: نشانی IP برای سقف نرخ درخواست و امنیت نشست.</li>
            </ul>
            <p className="mt-2">
              پیکرهٔ آرای قضایی از قبل از ورود شما ناشناس‌سازی شده است؛ نام، کد ملی،
              نشانی و تلفن اشخاص حقیقی پرونده‌ها در پاسخ ظاهر نمی‌شود.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۳. هدف و مبنای پردازش</h2>
            <p className="mt-2">
              پردازش برای اجرای قرارداد استفاده از سامانه (ورود، پاسخ، بازیابی رمز)،
              تأمین امنیت (جلوگیری از سوءاستفاده و تزریق درخواست)، و پاسخ به پیام
              تماس است. مبنای قانونی در حقوق ایران، رضایت اعلام‌شده هنگام ثبت‌نام و
              ضرورت اجرای تعهد قراردادی است. برای کاربران اتحادیه اروپا، این سیاست
              اصول GDPR را نیز رعایت می‌کند: حداقل‌سازی داده، محدودیت هدف، و امکان
              اعمال حقوق سوژهٔ داده.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۴. نگهداری</h2>
            <p className="mt-2">
              حساب و محتوای ذخیره‌شده تا زمان حذف حساب یا درخواست کتبی شما نگه داشته
              می‌شود. پیام‌های تماس حداقل نود روز برای پیگیری نگهداری می‌شوند. توکن
              بازیابی رمز حداکثر یک ساعت معتبر است و پس از مصرف یا انقضا باطل می‌شود.
              نسخه‌های پشتیبان پایگاه‌داده ممکن است تا سی روز باقی بمانند.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۵. گیرندگان و انتقال</h2>
            <p className="mt-2">
              میزبانی روی زیرساخت Vercel و پایگاه Postgres (Neon) است. مدل زبانی و
              بردارسازی برای تولید پاسخ به پردازنده‌های قراردادی (از جمله خدمات
              embedding و تکمیل متن) ارسال می‌شود؛ این پردازنده‌ها مجاز نیستند داده را
              برای آموزش مدل خود نگه دارند مگر قرارداد جداگانه داشته باشیم. ایمیل‌های
              تراکنشی (بازیابی رمز و اطلاع تماس) از طریق Resend ارسال می‌شود. داده به
              کارگزار احراز هویت شخص ثالث Grok منتقل نمی‌شود.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۶. کوکی و نشست</h2>
            <p className="mt-2">
              نشست با کوکی امن HttpOnly با پیشوند __Host- روی همین دامنه نگهداری
              می‌شود. کوکی تبلیغاتی یا ردیابی شخص ثالث نداریم. بدون این کوکی ورود
              پایدار ممکن نیست.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۷. حقوق شما</h2>
            <p className="mt-2">
              می‌توانید به داده‌های حساب دسترسی بخواهید، تصحیح کنید، یا حذف حساب را
              درخواست کنید. برای کاربران مشمول GDPR حق محدودیت پردازش، اعتراض، و
              انتقال‌پذیری نیز به رسمیت شناخته می‌شود. درخواست را از فرم تماس یا ایمیل
              بالا بفرستید؛ ظرف سی روز پاسخ داده می‌شود مگر قانون مهلت دیگری بگذارد.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۸. امنیت</h2>
            <p className="mt-2">
              ارتباط با HTTPS است. رمز عبور به‌صورت هش ذخیره می‌شود. سقف نرخ روی
              مسیرهای پرهزینه اعمال می‌شود. هیچ سامانه‌ای مطلقاً امن نیست؛ رخداد امنیتی
              طبق تکالیف قانونی اطلاع‌رسانی می‌شود.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۹. کودکان</h2>
            <p className="mt-2">
              سامانه برای افراد زیر هجده سال طراحی نشده است. اگر متوجه شویم حسابی برای
              کودک بدون رضایت ولی ایجاد شده، آن را حذف می‌کنیم.
            </p>
          </section>
          <section>
            <h2 className="text-[17px] font-bold text-fg">۱۰. تغییرات</h2>
            <p className="mt-2">
              نسخهٔ جاری همیشه در همین نشانی منتشر می‌شود. ادامهٔ استفاده پس از انتشار
              نسخهٔ جدید به معنای آگاهی از تغییرات ماهوی است. نسخهٔ قبلی از{" "}
              <Link to="/terms" className="font-medium text-fg underline-offset-4 hover:underline">
                شرایط استفاده
              </Link>{" "}
              جداگانه قابل مراجعه است.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
