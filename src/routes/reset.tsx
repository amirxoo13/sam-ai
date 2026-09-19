import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { authClient } from "@/lib/auth/client";
import { validatePasswordField } from "@/lib/form-validation";

export const Route = createFileRoute("/reset")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: ResetPage,
});

const fieldClass =
  "h-11 min-h-11 rounded-[8px] border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20";

function ResetPage() {
  const navigate = useNavigate();
  const { token, error: tokenError } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    tokenError === "INVALID_TOKEN" ? "پیوند بازیابی نامعتبر یا منقضی است. دوباره درخواست کنید." : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const passwordErr = validatePasswordField(password);
    if (passwordErr) {
      setFieldError(passwordErr);
      return;
    }
    if (password !== confirm) {
      setFieldError("تکرار رمز با رمز جدید یکسان نیست.");
      return;
    }
    if (!token) {
      setError("پیوند بازیابی ناقص است. از صفحهٔ فراموشی رمز دوباره اقدام کنید.");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (err) throw new Error("تعیین رمز جدید انجام نشد. پیوند را دوباره درخواست کنید.");
      await navigate({ to: "/login", search: { next: "/ask" } });
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
            تعیین رمز جدید
          </h1>
          <p className="mt-2 text-[14px] leading-7 text-muted">
            رمز عبور تازه باید حداقل ۸ کاراکتر باشد.
          </p>

          <div className="mt-8 rounded-[12px] border border-border bg-elevated p-6">
            <form onSubmit={submit} noValidate className="grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-[13px] font-medium text-muted">رمز جدید</span>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldError(null);
                  }}
                  placeholder="حداقل ۸ کاراکتر"
                  autoComplete="new-password"
                  aria-invalid={fieldError ? true : undefined}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-medium text-muted">تکرار رمز</span>
                <input
                  type="password"
                  dir="ltr"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setFieldError(null);
                  }}
                  placeholder="تکرار رمز جدید"
                  autoComplete="new-password"
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
                {busy ? "لطفاً صبر کنید…" : "ذخیرهٔ رمز جدید"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] leading-6 text-subtle">
            <Link to="/forgot" className="font-medium text-fg underline-offset-4 hover:underline">
              درخواست پیوند تازه
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
