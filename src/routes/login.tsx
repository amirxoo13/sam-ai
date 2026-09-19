import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { authClient } from "@/lib/auth/client";
import { returnToOrAsk, sanitizeReturnTo } from "@/lib/auth/return-to";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BRAND } from "@/lib/brand";
import { validateEmailField, validatePasswordField } from "@/lib/form-validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const next = sanitizeReturnTo(s.next);
    return next ? { next } : {};
  },
  component: LoginPage,
});

const fieldClass =
  "h-11 min-h-11 rounded-[8px] border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20";

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const destination = returnToOrAsk(next);
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: destination });
    }
  }, [isPending, user, navigate, destination]);

  if (!isPending && user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6" role="status">
        <div className="w-full max-w-sm space-y-3">
          <div className="skeleton-bar h-3 w-1/3" />
          <div className="skeleton-bar h-3 w-full" />
          <p className="pt-2 text-sm text-muted">در حال ورود به سامانه…</p>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nextEmailError = validateEmailField(email);
    const nextPasswordError = validatePasswordField(password);
    const nextConsentError =
      mode === "signup" && !consent
        ? "برای ثبت‌نام باید شرایط استفاده و حریم خصوصی را بپذیرید."
        : null;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConsentError(nextConsentError);
    if (nextEmailError || nextPasswordError || nextConsentError) return;

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (err) throw new Error("ثبت‌نام انجام نشد. ایمیل یا رمز را بررسی کنید.");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error("ورود انجام نشد. ایمیل یا رمز را بررسی کنید.");
      }
      let sessionReady = false;
      try {
        const { data } = await authClient.getSession({ query: { disableCookieCache: true } });
        sessionReady = Boolean(data?.user);
      } catch {
        sessionReady = false;
      }
      if (!sessionReady && typeof window !== "undefined") {
        window.location.assign(destination);
        return;
      }
      await navigate({ to: destination });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای غیرمنتظره");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <MarketingHeader active="home" />
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-[1.75rem] font-extrabold leading-[1.35] tracking-tight text-fg">
            {mode === "signup" ? "ایجاد حساب" : "ورود به سامانه"}
          </h1>
          <p className="mt-2 text-[14px] leading-7 text-muted">
            برای پرسش حقوقی، پرسش اقامتی و تنظیم برگه وارد حساب {BRAND.short} شوید.
          </p>

          <div className="mt-8 rounded-[12px] border border-border bg-elevated p-6">
            <div className="mb-5 flex rounded-[8px] bg-site-100 p-1">
              {(
                [
                  { id: "signin", label: "ورود" },
                  { id: "signup", label: "ثبت‌نام" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMode(t.id);
                    setError(null);
                    setEmailError(null);
                    setPasswordError(null);
                    setConsentError(null);
                    setConsent(false);
                  }}
                  className={cn(
                    "flex h-11 min-h-11 flex-1 items-center justify-center rounded-[8px] text-[13.5px] font-semibold transition-colors",
                    mode === t.id ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} noValidate className="grid gap-4">
              {mode === "signup" ? (
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-medium text-muted">نام</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام و نام‌خانوادگی"
                    autoComplete="name"
                    className={fieldClass}
                  />
                </label>
              ) : null}
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
                  className={fieldClass}
                />
                {emailError ? (
                  <span className="text-[12.5px] text-danger" role="alert">
                    {emailError}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-medium text-muted">رمز عبور</span>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="حداقل ۸ کاراکتر"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  aria-invalid={passwordError ? true : undefined}
                  className={fieldClass}
                />
                {passwordError ? (
                  <span className="text-[12.5px] text-danger" role="alert">
                    {passwordError}
                  </span>
                ) : null}
              </label>

              {mode === "signin" ? (
                <p className="text-[13px]">
                  <Link
                    to="/forgot"
                    className="font-medium text-fg underline-offset-4 hover:underline"
                  >
                    فراموشی رمز عبور
                  </Link>
                </p>
              ) : null}

              {mode === "signup" ? (
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[8px] border border-border bg-site-50 px-3 py-3 text-[13px] leading-6 text-muted">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      setConsentError(null);
                    }}
                    aria-invalid={consentError ? true : undefined}
                    className="mt-0.5 size-4 shrink-0 accent-fg"
                  />
                  <span>
                    <Link to="/terms" className="font-medium text-fg underline-offset-4 hover:underline">
                      شرایط استفاده
                    </Link>{" "}
                    و{" "}
                    <Link to="/privacy" className="font-medium text-fg underline-offset-4 hover:underline">
                      سیاست حریم خصوصی
                    </Link>{" "}
                    را خوانده‌ام و می‌پذیرم که این سامانه جایگزین مشاوره‌ی حقوقی رسمی
                    نیست و رابطهٔ وکیل–موکل ایجاد نمی‌کند.
                  </span>
                </label>
              ) : null}
              {consentError ? (
                <p className="text-[12.5px] text-danger" role="alert">
                  {consentError}
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
                className="mt-1 inline-flex h-12 min-h-12 items-center justify-center rounded-[8px] bg-fg text-[14.5px] font-bold text-accent-fg transition-colors hover:bg-site-800 disabled:opacity-50"
              >
                {busy ? "لطفاً صبر کنید…" : mode === "signup" ? "ایجاد حساب" : "ورود"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] leading-6 text-subtle">
            <Link to="/" className="font-medium text-fg underline-offset-4 hover:underline">
              بازگشت به خانه
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
