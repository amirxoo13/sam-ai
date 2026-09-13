import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function sendMail(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`پیام از سایت SAM AI — ${name || "کاربر"}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:akbarmousavi1356@gmail.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="contact" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <p className="mb-2 text-[12px] font-bold tracking-[0.18em] text-accent uppercase">
          تماس با ما
        </p>
        <h1 className="text-[26px] font-extrabold leading-[1.4]">
          نیاز به بررسی دقیق‌تر پرونده دارید؟
        </h1>
        <p className="mt-3 max-w-lg text-[14px] leading-7 text-muted">
          برای مشاورهٔ تخصصی با دفتر مؤسسه حقوقی SAM AI تماس بگیرید.
        </p>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
          <ContactLink
            icon={<Phone className="size-4" />}
            label="۰۹۱۲۲۱۶۸۵۱۲"
            href="tel:+989122168512"
          />
          <ContactLink
            icon={<MessageCircle className="size-4" />}
            label="واتس‌اپ"
            href="https://wa.me/989122168512"
          />
          <ContactLink
            icon={<Mail className="size-4" />}
            label="ایمیل"
            href="mailto:akbarmousavi1356@gmail.com"
          />
        </div>

        <form
          onSubmit={sendMail}
          className="mt-8 grid gap-3.5 rounded-2xl border border-border bg-elevated-2 p-5 sm:p-6"
        >
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">نام شما</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام و نام‌خانوادگی"
              className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">پیام</span>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="خلاصه‌ای از موضوع را بنویسید..."
              className="resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <button
            type="submit"
            className="mt-1 h-11 rounded-xl text-[14px] font-bold text-[#1a1305]"
            style={{
              background:
                "linear-gradient(135deg,var(--color-accent-light),var(--color-accent) 60%,var(--color-warn))",
            }}
          >
            ارسال از طریق ایمیل
          </button>
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
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-elevated-2 px-4 py-3 text-[13px] font-medium text-fg hover:border-accent/40"
    >
      {icon}
      {label}
    </a>
  );
}
