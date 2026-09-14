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

type NavKey = "home" | "ask" | "forms" | "residency" | "about" | "sources" | "contact";

const NAV_LINKS: {
  to: string;
  label: string;
  key: NavKey;
}[] = [
  { to: "/", label: "خانه", key: "home" },
  { to: "/ask", label: "پرسش حقوقی", key: "ask" },
  { to: "/forms", label: "برگه‌ها", key: "forms" },
  { to: "/residency", label: "پرسش اقامتی", key: "residency" },
  { to: "/sources", label: "منابع", key: "sources" },
  { to: "/about", label: "درباره", key: "about" },
  { to: "/contact", label: "تماس", key: "contact" },
];

function AccountChip() {
  const { user, isPending } = useCurrentUserState();
  // اندازهٔ اسکلت باید دقیقاً با ارتفاع نهایی برابر باشد؛ پیش‌تر
  // 36/40px بود و به یک چیپ بلندتر حل می‌شد، یعنی هر بار بارگذاری یک
  // پرش چیدمان (CLS) در هدر داشتیم.
  if (isPending) return <div className="size-11 shrink-0 rounded-full bg-surface" aria-hidden="true" />;
  if (!user) {
    return (
      <Link
        to="/login"
        search={{ next: "/ask" }}
        className="inline-flex h-11 min-h-11 shrink-0 items-center rounded-lg border border-accent/40 px-3 text-[12.5px] font-bold text-accent-light transition-colors hover:bg-accent/10 sm:text-[13px]"
      >
        ورود
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "کاربر";
  return (
    <Link
      to="/profile"
      className="inline-flex h-11 min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-2 transition-colors hover:border-accent/40"
      aria-label="پروفایل کاربری"
    >
      {user.profileImageUrl ? (
        <img src={user.profileImageUrl} alt="" className="size-7 rounded-full object-cover" />
      ) : (
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-[12px] font-bold text-accent-fg"
          aria-hidden="true"
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
  active: NavKey | "profile";
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-bg/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3" aria-label="SAM AI — خانه">
          <img
            src="/logo.png"
            alt=""
            width={38}
            height={38}
            className="size-9 shrink-0 rounded-full ring-1 ring-accent/35 sm:size-[42px]"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-baseline gap-2">
              <span className="text-[16px] font-extrabold tracking-tight sm:text-[18px]">
                SAM<span className="text-cyan">AI</span>
              </span>
              <span className="hidden text-xs text-subtle sm:inline">مؤسسه حقوقی</span>
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
          {NAV_LINKS.map((link) => {
            const isActive = active === link.key;
            return (
              <Link
                key={link.to}
                to={link.to}
                // حالت فعال تا امروز فقط با رنگ منتقل می‌شد (WCAG 1.4.1) و
                // هیچ معادل برنامه‌ای نداشت؛ aria-current به screen reader
                // می‌گوید کاربر الان در کدام بخش است.
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // h-11 برای رسیدن به هدف لمس ۴۴px (WCAG 2.5.8).
                  // پیش‌تر روی موبایل ۳۶px بود.
                  "flex h-11 min-h-11 shrink-0 items-center rounded-md px-3 text-[12.5px] font-medium transition-colors sm:text-[13.5px]",
                  isActive ? "bg-elevated-2 text-accent-light" : "text-muted hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <AccountChip />
      </div>
    </header>
  );
}
