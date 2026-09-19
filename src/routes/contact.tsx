import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

const fieldClass =
  "rounded-[8px] border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20";

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
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader active="contact" />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-6 py-16 lg:px-10">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.18em] text-site-500">تماس با ما</p>
        <h1 className="text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg">
          نیاز به بررسی دقیق‌تر پرونده دارید؟
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          برای مشاورهٔ تخصصی با دفتر مؤسسه حقوقی {BRAND.short} تماس بگیرید.
        </p>

        <div className="mt-8 grid gap-2.5">
          <ContactLink icon={<Phone className="size-4" />} label="۰۹۱۲۲۱۶۸۵۱۲" href="tel:+989122168512" />
          <ContactLink icon={<MessageCircle className="size-4" />} label="واتس‌اپ" href="https://wa.me/989122168512" />
          <ContactLink icon={<Mail className="size-4" />} label="ایمیل" href="mailto:akbarmousavi1356@gmail.com" />
        </div>

        <form onSubmit={sendMail} className="mt-10 grid gap-4 rounded-[12px] border border-border bg-elevated p-6">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-muted">نام شما</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام و نام‌خانوادگی"
              className={`h-11 min-h-11 ${fieldClass}`}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-muted">پیام</span>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="خلاصه‌ای از موضوع را بنویسید..."
              className={`min-h-32 resize-y py-2.5 leading-7 ${fieldClass}`}
            />
          </label>
          <button
            type="submit"
            className="mt-1 inline-flex h-12 min-h-12 items-center justify-center rounded-[8px] bg-fg text-[14px] font-bold text-accent-fg hover:bg-site-800"
          >
            ارسال از طریق ایمیل
          </button>
        </form>
      </main>
      <MarketingFooter />
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
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-elevated px-4 py-3 text-[13px] font-medium text-fg hover:border-site-400"
    >
      {icon}
      {label}
      {href.startsWith("http") ? (
        <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
      ) : null}
    </a>
  );
}
