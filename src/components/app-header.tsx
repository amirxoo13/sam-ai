import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * این هدر عمداً پیکسل‌به‌پیکسل شبیه Navbar سایت اقامت (cursor/SAMAI) ساخته
 * شده — همان لوگوی دایره‌ای با حلقه‌ی طلایی، همان آرم «SAM<span
 * cyan>AI</span>»، همان زیرنویس «Smart Attorney Mind»، همان استایل تب‌های
 * فعال/غیرفعال — تا با اینکه این دو بخش (اقامت + وکیل حقوقی) از دو کدبیس
 * جدا سرو می‌شوند، از دید کاربر کاملاً یک سایت واحد به‌نظر برسند.
 */

const NAV_LINKS: { to: string; label: string; key: "ask" | "forms" | "residency" }[] = [
  { to: "/", label: "پرسش حقوقی", key: "ask" },
  { to: "/forms", label: "برگه‌ها", key: "forms" },
  { to: "/residency", label: "پرسش اقامتی", key: "residency" },
];

function AccountChip() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-9 w-9 shrink-0 rounded-full bg-surface sm:h-10 sm:w-10" />;
  if (!user) {
    return (
      <Link
        to="/login"
        className="shrink-0 rounded-lg border border-accent/40 px-3 py-2 text-[12.5px] font-bold text-accent-light hover:bg-accent/10 sm:text-[13px]"
      >
        ورود
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "کاربر";
  return (
    <Link
      to="/profile"
      className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-2 py-1.5 hover:border-accent/40"
      aria-label="پروفایل کاربری"
    >
      {user.profileImageUrl ? (
        <img src={user.profileImageUrl} alt="" className="size-7 rounded-full object-cover" />
      ) : (
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-[#1a1305]"
          style={{ background: "linear-gradient(135deg,var(--color-accent-light),var(--color-accent))" }}
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-24 truncate text-[12.5px] font-medium text-fg sm:inline">
        {label}
      </span>
    </Link>
  );
}

export function AppHeader({
  corpusLabel,
  active,
}: {
  corpusLabel?: string;
  active: "ask" | "forms" | "residency" | "profile";
}) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-border-soft backdrop-blur-sm"
      style={{ background: "rgba(5, 7, 13, 0.72)" }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3" aria-label="SAM AI">
          <img
            src="/logo.png"
            alt="SAM AI — Smart Attorney Mind"
            width={38}
            height={38}
            className="size-9 shrink-0 rounded-full sm:size-[42px]"
            style={{ boxShadow: "0 0 0 1px rgba(217,178,92,0.35)" }}
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-baseline gap-2">
              <span className="text-[16px] font-extrabold tracking-tight sm:text-[18px]">
                SAM<span className="text-cyan">AI</span>
              </span>
              <span className="hidden text-xs text-subtle sm:inline">Smart Attorney Mind</span>
            </span>
            <span className="hidden truncate text-[11px] text-muted sm:block">
              {corpusLabel ?? "دستیار حقوقی و اقامتی هوشمند"}
            </span>
          </span>
        </Link>

        <nav
          className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mr-auto sm:w-auto [&::-webkit-scrollbar]:hidden"
          aria-label="بخش‌ها"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex h-9 shrink-0 items-center rounded-md px-3 text-[12.5px] font-medium transition-colors sm:h-10 sm:text-[13.5px]",
                active === link.key
                  ? "bg-elevated-2 text-accent-light"
                  : "text-muted hover:text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <AccountChip />
      </div>
    </header>
  );
}
