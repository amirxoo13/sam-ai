import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : "/ask",
  }),
  component: LoginPage,
});

const NEXT_ROUTES = ["/", "/ask", "/forms", "/residency", "/profile", "/sources", "/about", "/contact"] as const;
type NextRoute = (typeof NEXT_ROUTES)[number];

function safeNext(next: string): NextRoute {
  if (next === "/login") return "/ask";
  return (NEXT_ROUTES as readonly string[]).includes(next) ? (next as NextRoute) : "/ask";
}

const fieldClass =
  "h-11 min-h-11 rounded-[8px] border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-fg/20";

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: safeNext(next) });
    }
  }, [isPending, user, navigate, next]);

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
    if (mode === "signup" && !consent) {
      setError("برای ثبت‌نام باید شرایط استفاده را بپذیرید.");
      return;
    }
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
        window.location.assign(safeNext(next));
        return;
      }
      await navigate({ to: safeNext(next) });
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

            <form onSubmit={submit} className="grid gap-4">
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
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-medium text-muted">رمز عبور</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className={fieldClass}
                />
              </label>

              {mode === "signup" ? (
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[8px] border border-border bg-site-50 px-3 py-3 text-[13px] leading-6 text-muted">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-fg"
                  />
                  <span>
                    شرایط استفاده را خوانده‌ام و می‌پذیرم که این سامانه جایگزین
                    مشاوره‌ی حقوقی رسمی نیست.
                  </span>
                </label>
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
                disabled={busy || (mode === "signup" && !consent)}
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
