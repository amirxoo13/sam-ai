import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { BRAND } from "@/lib/brand";
import {
  validateEmailField,
  validateMessageField,
  validateNameField,
} from "@/lib/form-validation";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

const fieldClass =
  "rounded-[8px] border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20";

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const nextName = validateNameField(name);
    const nextEmail = validateEmailField(email);
    const nextMessage = validateMessageField(message);
    setNameError(nextName);
    setEmailError(nextEmail);
    setMessageError(nextMessage);
    if (nextName || nextEmail || nextMessage) return;

    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(body.error || "ارسال پیام انجام نشد.");
      }
      setSuccess(body.message || "پیام شما ثبت شد.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارسال پیام انجام نشد.");
    } finally {
      setBusy(false);
    }
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
          پیام را از فرم زیر بفرستید. دفتر مؤسسه حقوقی {BRAND.short} آن را می‌خواند.
          این سامانه جایگزین مشاوره‌ی حقوقی رسمی نیست.
        </p>

        <div className="mt-8 grid gap-2.5">
          <ContactLink icon={<Phone className="size-4" />} label="۰۹۱۲۲۱۶۸۵۱۲" href="tel:+989122168512" />
          <ContactLink icon={<MessageCircle className="size-4" />} label="واتس‌اپ" href="https://wa.me/989122168512" />
          <ContactLink icon={<Mail className="size-4" />} label="ایمیل" href="mailto:akbarmousavi1356@gmail.com" />
        </div>

        <form onSubmit={submit} noValidate className="mt-10 grid gap-4 rounded-[12px] border border-border bg-elevated p-6">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-muted">نام شما</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              placeholder="نام و نام‌خانوادگی"
              autoComplete="name"
              aria-invalid={nameError ? true : undefined}
              className={`h-11 min-h-11 ${fieldClass}`}
            />
            {nameError ? (
              <span className="text-[12.5px] text-danger" role="alert">
                {nameError}
              </span>
            ) : null}
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-muted">ایمیل</span>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={emailError ? true : undefined}
              className={`h-11 min-h-11 ${fieldClass}`}
            />
            {emailError ? (
              <span className="text-[12.5px] text-danger" role="alert">
                {emailError}
              </span>
            ) : null}
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-muted">پیام</span>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageError(null);
              }}
              rows={5}
              placeholder="خلاصه‌ای از موضوع را بنویسید..."
              aria-invalid={messageError ? true : undefined}
              className={`min-h-32 resize-y py-2.5 leading-7 ${fieldClass}`}
            />
            {messageError ? (
              <span className="text-[12.5px] text-danger" role="alert">
                {messageError}
              </span>
            ) : null}
          </label>
          {error ? (
            <p
              className="rounded-[8px] border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {success ? (
            <p
              className="rounded-[8px] border border-border bg-site-50 px-3 py-2 text-[12.5px] text-fg"
              role="status"
            >
              {success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex h-12 min-h-12 items-center justify-center rounded-[8px] bg-fg text-[14px] font-bold text-accent-fg hover:bg-site-800 disabled:opacity-50"
          >
            {busy ? "در حال ارسال…" : "ارسال پیام"}
          </button>
          <p className="text-center text-[12.5px] leading-6 text-subtle">
            یا{" "}
            <a href="mailto:akbarmousavi1356@gmail.com" className="font-medium text-fg underline-offset-4 hover:underline">
              مستقیم با ایمیل
            </a>{" "}
            بنویسید.
          </p>
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
