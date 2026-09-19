import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { authClient } from "@/lib/auth/client";
import { validateEmailField } from "@/lib/form-validation";

export const Route = createFileRoute("/forgot")({
  component: ForgotPage,
});

const fieldClass =
  "h-11 min-h-11 rounded-[8px] border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20";

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailErr = validateEmailField(email);
    setFieldError(emailErr);
    if (emailErr) return;
    setBusy(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset",
      });
      if (err) {
        const code = (err as { code?: string }).code;
        if (code === "RESET_PASSWORD_DISABLED" || /isn't enabled|not configured/i.test(err.message ?? "")) {
          throw new Error("ارسال ایمیل بازیابی در حال حاضر ممکن نیست. از فرم تماس پیام بگذارید.");
        }
        throw new Error("ارسال پیوند بازیابی انجام نشد. بعداً دوباره تلاش کنید.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای غیرمنتظره");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <MarketingHeader />
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-[1.75rem] font-extrabold leading-[1.35] tracking-tight text-fg">
            بازیابی رمز عبور
          </h1>
          <p className="mt-2 text-[14px] leading-7 text-muted">
            ایمیل حساب را وارد کنید. اگر حسابی با این نشانی وجود داشته باشد، پیوند
            تعیین رمز جدید برایتان ارسال می‌شود.
          </p>

          <div className="mt-8 rounded-[12px] border border-border bg-elevated p-6">
            {done ? (
              <p className="text-[14px] leading-7 text-muted" role="status">
                اگر حسابی با این ایمیل وجود داشته باشد، پیوند بازیابی ارسال شد.
                صندوق ورودی و پوشهٔ هرزنامه را بررسی کنید.
              </p>
            ) : (
              <form onSubmit={submit} noValidate className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-medium text-muted">ایمیل</span>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError(null);
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={fieldError ? true : undefined}
                    className={fieldClass}
                  />
                </label>
                {fieldError ? (
                  <p className="text-[12.5px] text-danger" role="alert">
                    {fieldError}
                  </p>
                ) : null}
                {error ? (
                  <p
                    className="rounded-[8px] border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] text-danger"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 inline-flex h-12 min-h-12 items-center justify-center rounded-[8px] bg-fg text-[14.5px] font-bold text-accent-fg hover:bg-site-800 disabled:opacity-50"
                >
                  {busy ? "لطفاً صبر کنید…" : "ارسال پیوند بازیابی"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-5 text-center text-[13px] leading-6 text-subtle">
            <Link to="/login" className="font-medium text-fg underline-offset-4 hover:underline">
              بازگشت به ورود
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
