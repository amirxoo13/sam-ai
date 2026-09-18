import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

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

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: safeNext(next) });
    }
  }, [isPending, user, navigate, next]);

  if (!isPending && user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">
        در حال ورود به سامانه…
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      // انبارهٔ سشن کلاینت را پیش از رفتن رفرش کن.
      // بدون این، navigate بلافاصله اجرا می‌شد در حالی که useSession هنوز
      // مقدار قدیمی (user=null, isPending=false) داشت؛ RequireAuth مقصد آن را
      // «خارج‌شده» می‌خواند و کاربر را همان لحظه به /login برمی‌گرداند — یعنی
      // ورود موفق (۲۰۰) ولی کاربر هرگز داخل نمی‌شد. مسیر OAuth در
      // lib/auth/client.ts از قبل همین کار را می‌کند.
      let sessionReady = false;
      try {
        const { data } = await authClient.getSession({ query: { disableCookieCache: true } });
        sessionReady = Boolean(data?.user);
      } catch {
        sessionReady = false;
      }
      if (!sessionReady && typeof window !== "undefined") {
        // انبار به هر دلیلی به‌روز نشد. ناوبری سخت، بارگذاری تازه با همان کوکی
        // است و سشن سمت سرور حل می‌شود — کاربر هرگز در حلقهٔ /login گیر نمی‌کند.
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
      <AppHeader active="home" />
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <img
              src={BRAND.logoSrc}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-sm object-cover ring-1 ring-border"
            />
            <div>
              <h1 className="t-h3 text-fg">ورود موکل</h1>
              <p className="t-caption mt-1 text-subtle">
                {BRAND.name} — {BRAND.tagline}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-elevated-2 p-7 sm:p-8">
            {/* انتخاب حالت: نوار تب روی سطح فرورفته، تب فعال سفید و
                بالاتر — تمایز از ارتفاع می‌آید نه از رنگ اکسنت. */}
            <div className="mb-7 flex rounded-sm bg-surface p-1" role="tablist" aria-label="حالت ورود">
              {(
                [
                  { id: "signin", label: "ورود" },
                  { id: "signup", label: "ثبت‌نام" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === t.id}
                  onClick={() => {
                    setMode(t.id);
                    setError(null);
                  }}
                  className={cn(
                    "control-h flex flex-1 items-center justify-center rounded-sm text-[13.5px] transition-colors",
                    mode === t.id
                      ? "bg-elevated-2 font-medium text-fg shadow-[0_1px_2px_rgba(15,14,13,0.06)]"
                      : "font-normal text-muted hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="grid gap-6">
              {mode === "signup" ? (
                <label className="grid gap-2">
                  <span className="text-[13px] font-medium text-fg">نام</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام و نام‌خانوادگی"
                    autoComplete="name"
                    className="h-12 rounded-sm border border-border bg-bg px-4 text-sm text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
                  />
                </label>
              ) : null}
              <label className="grid gap-2">
                <span className="text-[13px] font-medium text-fg">ایمیل</span>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 rounded-sm border border-border bg-bg px-4 text-sm text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-[13px] font-medium text-fg">رمز عبور</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-12 rounded-sm border border-border bg-bg px-4 text-sm text-fg transition-colors placeholder:text-subtle hover:border-n300 focus:border-fg focus:outline-none"
                />
              </label>

              {error ? (
                <p
                  className="rounded-sm border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] leading-6 text-danger-fg"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="control-h-lg rounded-sm bg-fg text-[14px] font-medium text-bg transition-colors hover:bg-n800 disabled:opacity-40"
              >
                {busy ? "لطفاً صبر کنید…" : mode === "signup" ? "ایجاد حساب" : "ورود"}
              </button>
            </form>
          </div>

          <p className="t-caption mt-6 text-center text-subtle">
            برای پرسش حقوقی، پرسش اقامتی و تنظیم برگه باید وارد حساب کاربری خود
            شوید.
            <span className="mt-1 block">
              <Link to="/" className="link-inline font-medium">
                بازگشت به خانه
              </Link>
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
