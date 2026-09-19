import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type NavKey = "home" | "ask" | "forms" | "residency" | "about" | "sources" | "contact";

const NAV_LINKS: { to: string; label: string; key: NavKey }[] = [
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
  if (isPending) {
    return (
      <div
        className="flex h-11 min-h-11 w-[7.5rem] shrink-0 items-center gap-2 rounded-[8px] border border-border bg-elevated px-2"
        aria-hidden="true"
      >
        <span className="skeleton-bar size-7 shrink-0 rounded-[8px]" />
        <span className="skeleton-bar h-2.5 flex-1" />
      </div>
    );
  }
  if (!user) {
    return (
      <Link
        to="/login"
        search={{ next: "/ask" }}
        className="inline-flex h-11 min-h-11 shrink-0 items-center rounded-[8px] border border-border bg-elevated px-4 text-[13px] font-semibold text-fg transition-colors hover:border-site-400"
      >
        ورود
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "کاربر";
  return (
    <Link
      to="/profile"
      className="inline-flex h-11 min-h-11 shrink-0 items-center gap-2 rounded-[8px] border border-border bg-elevated px-2 transition-colors hover:border-site-400"
      aria-label="پروفایل کاربری"
    >
      {user.profileImageUrl ? (
        <img src={user.profileImageUrl} alt="" className="size-7 rounded-[8px] object-cover" />
      ) : (
        <span
          className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-fg text-[12px] font-bold text-accent-fg"
          aria-hidden="true"
        >
          {label.charAt(0)}
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
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link to="/" className="shrink-0 rounded-[8px]" aria-label={`${BRAND.name} — خانه`}>
          <BrandMark size="md" subtitle={corpusLabel ?? BRAND.tagline} />
        </Link>

        <nav className="mx-auto hidden items-center gap-0.5 lg:flex" aria-label="بخش‌ها">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.key;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-11 min-h-11 shrink-0 items-center rounded-[8px] px-3 text-[13.5px] font-medium transition-colors",
                  isActive ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {link.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-fg"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <AccountChip />
        </div>
      </div>

      <nav
        className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1.5 [-ms-overflow-style:none] [mask-image:linear-gradient(to_left,transparent,#000_24px,#000_calc(100%-24px),transparent)] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="بخش‌ها"
      >
        {NAV_LINKS.map((link) => {
          const isActive = active === link.key;
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-11 min-h-11 shrink-0 items-center rounded-[8px] px-3 text-[13px] font-medium transition-colors",
                isActive ? "bg-site-100 text-fg" : "text-muted hover:text-fg",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
