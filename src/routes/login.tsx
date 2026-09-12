import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
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
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <img
              src="/logo.png"
              alt="SAM AI"
              width={56}
              height={56}
              className="rounded-full"
              style={{ boxShadow: "0 0 0 1px rgba(217,178,92,0.35)" }}
            />
            <div>
              <div className="text-[20px] font-extrabold tracking-tight">
                SAM<span className="text-cyan">AI</span>
              </div>
              <p className="mt-1 text-[12.5px] text-subtle">مؤسسه حقوقی — ورود موکل</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-elevated-2 p-6">
            <div className="mb-5 flex rounded-lg bg-surface p-1">
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
                  }}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center rounded-md text-[13.5px] font-medium transition-colors",
                    mode === t.id ? "bg-elevated-2 text-accent-light" : "text-muted hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="grid gap-3.5">
              {mode === "signup" ? (
                <label className="grid gap-1.5">
                  <span className="text-xs text-muted">نام</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام و نام‌خانوادگی"
                    autoComplete="name"
                    className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </label>
              ) : null}
              <label className="grid gap-1.5">
                <span className="text-xs text-muted">ایمیل</span>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted">رمز عبور</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>

              {error ? (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-[#fca5a5]" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 h-11 rounded-xl text-[14.5px] font-bold text-[#1a1305] transition-[filter] disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent-light), var(--color-accent) 60%, var(--color-warn))",
                }}
              >
                {busy ? "لطفاً صبر کنید…" : mode === "signup" ? "ایجاد حساب" : "ورود"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[12px] leading-6 text-subtle">
            برای پرسش حقوقی، پرسش اقامتی و تنظیم برگه باید وارد حساب کاربری خود شوید.
            <span className="block">
              <Link to="/" className="text-accent-light hover:underline">
                بازگشت به خانه
              </Link>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
