import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * این هدر عمداً پیکسل‌به‌پیکسل شبیه Navbar سایت اقامت (cursor/SAMAI) ساخته
 * شده — همان لوگوی دایره‌ای با حلقه‌ی طلایی، همان آرم «SAM<span
 * cyan>AI</span>»، همان زیرنویس «Smart Attorney Mind»، همان استایل تب‌های
 * فعال/غیرفعال — تا با اینکه این دو بخش (اقامت + وکیل حقوقی) از دو کدبیس
 * جدا سرو می‌شوند، از دید کاربر کاملاً یک سایت واحد به‌نظر برسند.
 */

const NAV_LINKS: { to: string; label: string; key: "ask" | "forms" | "residency" }[] = [
  { to: "/", label: "پرسش حقوقی", key: "ask" },
  { to: "/forms", label: "برگه‌ها و دادرسی", key: "forms" },
  { to: "/residency", label: "پرسش اقامتی", key: "residency" },
];

export function AppHeader({
  corpusLabel,
  active,
}: {
  corpusLabel?: string;
  active: "ask" | "forms" | "residency";
}) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-border-soft backdrop-blur-sm"
      style={{ background: "rgba(5, 7, 13, 0.72)" }}
    >
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3" aria-label="SAM AI">
          <img
            src="/logo.png"
            alt="SAM AI — Smart Attorney Mind"
            width={42}
            height={42}
            className="rounded-full"
            style={{ boxShadow: "0 0 0 1px rgba(217,178,92,0.35)" }}
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-baseline gap-2">
              <span className="text-[18px] font-extrabold tracking-tight">
                SAM<span className="text-cyan">AI</span>
              </span>
              <span className="hidden text-xs text-subtle sm:inline">Smart Attorney Mind</span>
            </span>
            <span className="truncate text-[11px] text-muted">
              {corpusLabel ?? "دستیار حقوقی و اقامتی هوشمند"}
            </span>
          </span>
        </Link>

        <nav className="mr-auto flex items-center gap-1 rounded-lg bg-surface p-1" aria-label="بخش‌ها">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex h-10 items-center rounded-md px-3 text-[13.5px] font-medium transition-colors",
                active === link.key
                  ? "bg-elevated-2 text-accent-light"
                  : "text-muted hover:text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
