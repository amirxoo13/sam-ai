import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

/**
 * هدر در بالای صفحه بی‌قاب است (هم‌رنگ بوم، بدون خط و سایه) و فقط پس از
 * اسکرول، خط جداکننده و پس‌زمینهٔ نیمه‌شفاف می‌گیرد.
 *
 * دلیلش صرفاً زیبایی نیست: هدرِ چسبانی که همیشه قاب دارد، در بالای صفحه
 * با تیتر hero سر تضاد بصری رقابت می‌کند. وقتی محتوا زیرش می‌رود، همان
 * خط لازم می‌شود تا لبهٔ ناحیهٔ ثابت مشخص باشد.
 */
function useScrolled(threshold = 8) {
  // مقدار اولیه روی سرور و کلاینت یکسان است (false)، پس hydration
  // ناهمخوانی نمی‌گیرد؛ اولین افکت وضعیت واقعی را تنظیم می‌کند.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function AccountArea() {
  const { user, isPending } = useCurrentUserState();

  // اسکلت باید دقیقاً هم‌ارتفاع نتیجهٔ نهایی باشد تا هدر هنگام حل‌شدن
  // سشن نپرد (CLS). مستطیل خالی نه — اسکلتِ درخشان، تا معلوم باشد چیزی
  // در راه است.
  if (isPending) {
    return (
      <div
        className="skeleton control-h w-28 shrink-0 rounded-sm"
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        {/* اقدام فرعی: متن ساده، عمداً بدون وزن بصری دکمه. */}
        <Link
          to="/login"
          search={{ next: "/profile" }}
          className="control-h hidden items-center rounded-sm px-3 text-[13.5px] font-medium text-muted transition-colors hover:text-fg sm:inline-flex"
        >
          ورود
        </Link>
        {/* اقدام اصلی — همان فعلی که در کل سایت تکرار می‌شود. */}
        <Link
          to="/login"
          search={{ next: "/ask" }}
          className="control-h inline-flex shrink-0 items-center rounded-sm bg-fg px-4 text-[13.5px] font-medium text-bg transition-colors hover:bg-n800"
        >
          {BRAND.cta}
        </Link>
      </div>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "کاربر";
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        to="/profile"
        className="control-h inline-flex shrink-0 items-center gap-2 rounded-sm px-2 transition-colors hover:bg-elevated"
        aria-label="پروفایل کاربری"
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-7 rounded-sm object-cover" />
        ) : (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-sm bg-fg text-[12px] font-medium text-bg"
            aria-hidden="true"
          >
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-24 truncate text-[12.5px] font-medium text-fg sm:inline">
          {label}
        </span>
      </Link>
      <Link
        to="/ask"
        className="control-h hidden shrink-0 items-center rounded-sm bg-fg px-4 text-[13.5px] font-medium text-bg transition-colors hover:bg-n800 sm:inline-flex"
      >
        {BRAND.cta}
      </Link>
    </div>
  );
}

export function AppHeader({
  corpusLabel,
  active,
}: {
  corpusLabel?: string;
  active: NavKey | "profile";
}) {
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-[background-color,border-color] duration-200",
        scrolled
          ? "border-b border-border bg-bg/85 backdrop-blur-md"
          : "border-b border-transparent bg-bg",
      )}
    >
      <div className="container-wide flex h-[68px] items-center gap-3 lg:h-[84px]">
        <Link
          to="/"
          className="control-h inline-flex shrink-0 items-center rounded-sm"
          aria-label={`${BRAND.name} — خانه`}
        >
          <BrandMark size="md" subtitle={corpusLabel ?? BRAND.tagline} />
        </Link>

        {/* ناوبری دسکتاپ — در وسط، با وزن بصری کمتر از آرم و CTA. */}
        <nav className="mx-auto hidden items-center gap-0.5 lg:flex" aria-label="بخش‌ها">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.key;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "control-h relative flex shrink-0 items-center rounded-sm px-3 text-[13.5px] transition-colors",
                  isActive ? "font-medium text-fg" : "font-normal text-muted hover:text-fg",
                )}
              >
                {link.label}
                {/* نشانگر بخش فعال — علاوه بر رنگ، یک نشانهٔ شکلی دارد تا
                    فقط با رنگ منتقل نشود (WCAG 1.4.1). */}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1.5 h-px bg-fg"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center lg:ms-0">
          <AccountArea />
        </div>
      </div>

      {/* ناوبری موبایل/تبلت — ردیف جداگانه و قابل اسکرول. ماسک محوشونده در
          لبه نشان می‌دهد که ردیف ادامه دارد؛ بدون آن هیچ نشانه‌ای از وجود
          تب‌های بیشتر نیست چون اسکرول‌بار مخفی است. */}
      <nav
        className="flex items-center gap-1 border-t border-border-soft px-4 py-1.5 overflow-x-auto [-ms-overflow-style:none] [mask-image:linear-gradient(to_left,transparent,#000_24px,#000_calc(100%-24px),transparent)] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
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
                "flex h-11 min-h-11 shrink-0 items-center rounded-sm px-3 text-[13px] transition-colors",
                isActive
                  ? "bg-elevated font-medium text-fg"
                  : "font-normal text-muted hover:text-fg",
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
