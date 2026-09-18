import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

/* توکن‌های فرم — یک بار تعریف، همه‌جا یکسان.
   ارتفاع فیلد ۴۸ پیکسل، شعاع ۴ پیکسل، فاصلهٔ برچسب تا فیلد ۸ پیکسل و
   فاصلهٔ ردیف‌ها ۲۴ پیکسل. پیش از این هر فرم پروژه (تماس، ورود، برگه‌ها)
   اعداد خودش را داشت. */
const FIELD =
  "h-12 w-full rounded-sm border border-border bg-elevated-2 px-4 text-sm text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none";
const FIELD_MULTILINE =
  "w-full resize-y rounded-sm border border-border bg-elevated-2 px-4 py-3 text-sm leading-8 text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none";
const LABEL = "text-[13px] font-medium text-fg";

function ContactPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function sendMail(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`پیام از سایت ${BRAND.name} — ${name || "کاربر"}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:akbarmousavi1356@gmail.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="contact" />
      <main id="main" className="container-prose flex-1 py-14 lg:py-20">
        <p className="t-eyebrow">تماس با ما</p>
        <h1 className="t-h1 mt-3 text-fg">نیاز به بررسی دقیق‌تر پرونده دارید؟</h1>
        <p className="t-body mt-4 max-w-lg text-muted">
          برای مشاورهٔ تخصصی با دفتر مؤسسهٔ حقوقی {BRAND.name} تماس بگیرید.
        </p>

        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          <ContactLink
            icon={<Phone className="size-4" aria-hidden="true" />}
            label="۰۹۱۲۲۱۶۸۵۱۲"
            href="tel:+989122168512"
          />
          <ContactLink
            icon={<MessageCircle className="size-4" aria-hidden="true" />}
            label="واتس‌اپ"
            href="https://wa.me/989122168512"
          />
          <ContactLink
            icon={<Mail className="size-4" aria-hidden="true" />}
            label="ایمیل"
            href="mailto:akbarmousavi1356@gmail.com"
          />
        </div>

        <form
          onSubmit={sendMail}
          className="mt-10 grid gap-6 border-t border-border pt-8"
        >
          <h2 className="t-h3 text-fg">فرم پیام</h2>

          <label className="grid gap-2">
            <span className={LABEL}>نام شما</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام و نام‌خانوادگی"
              autoComplete="name"
              className={FIELD}
            />
          </label>

          <label className="grid gap-2">
            <span className={LABEL}>پیام</span>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="خلاصه‌ای از موضوع را بنویسید…"
              className={FIELD_MULTILINE}
            />
          </label>

          <div>
            <button
              type="submit"
              className="control-h-lg inline-flex w-full items-center justify-center rounded-sm bg-fg px-6 text-[14px] font-medium text-bg transition-colors hover:bg-n800 sm:w-auto"
            >
              ارسال از طریق ایمیل
            </button>
            <p className="t-caption mt-3 text-subtle">
              این دکمه برنامهٔ ایمیل دستگاه شما را با متن آماده باز می‌کند؛ پیام
              روی این سایت ذخیره نمی‌شود.
            </p>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function ContactLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex h-12 items-center justify-center gap-2 rounded-sm border border-border bg-elevated-2 px-4 text-[13px] font-medium text-fg transition-colors hover:border-n300 hover:bg-elevated"
    >
      {icon}
      {label}
      {external ? <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span> : null}
    </a>
  );
}
