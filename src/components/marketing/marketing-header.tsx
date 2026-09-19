import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BrandMark } from "@/components/brand-mark";

type NavKey = "home" | "ask" | "forms" | "residency" | "sources" | "about" | "contact";

const NAV_LINKS: { to: string; label: string; key: NavKey }[] = [
  { to: "/", label: "خانه", key: "home" },
  { to: "/ask", label: "پرسش حقوقی", key: "ask" },
  { to: "/residency", label: "پرسش اقامتی", key: "residency" },
  { to: "/forms", label: "برگه‌ها", key: "forms" },
  { to: "/sources", label: "منابع", key: "sources" },
  { to: "/about", label: "درباره", key: "about" },
  { to: "/contact", label: "تماس", key: "contact" },
];

export const PRIMARY_CTA_LABEL = BRAND.cta;

export function MarketingBrand({ size = "md" }: { size?: "sm" | "md" }) {
  return <BrandMark size={size} />;
}

export function PrimaryCta({
  className,
  label = PRIMARY_CTA_LABEL,
}: {
  className?: string;
  label?: string;
}) {
  const { user } = useCurrentUserState();
  const cls = cn(
    "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-[8px] bg-fg px-3 text-[13px] font-bold text-accent-fg transition-colors hover:bg-site-800 sm:h-12 sm:min-h-12 sm:px-5 sm:text-[14px]",
    className,
  );
  return user ? (
    <Link to="/ask" className={cls}>
      {label}
    </Link>
  ) : (
    <Link to="/login" search={{ next: "/ask" }} className={cls}>
      {label}
    </Link>
  );
}

export function MarketingHeader({ active }: { active: NavKey }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-colors duration-200",
        scrolled
          ? "border-b border-border bg-bg/95 backdrop-blur-md"
          : "border-b border-transparent bg-bg",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-6 sm:h-20 lg:px-10">
        <Link to="/" className="min-w-0 shrink rounded-[8px]" aria-label={`${BRAND.name} — خانه`}>
          <MarketingBrand />
        </Link>

        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="بخش‌ها">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.key;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-11 min-h-11 shrink-0 items-center rounded-[8px] px-3 text-[14px] transition-colors",
                  isActive ? "font-semibold text-fg" : "text-muted hover:text-fg",
                )}
              >
                {link.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-2 h-px bg-fg"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center lg:ms-0">
          <PrimaryCta />
        </div>
      </div>

      <nav
        className={cn(
          "flex items-center gap-1 overflow-x-auto px-6 py-1.5 lg:hidden",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "[mask-image:linear-gradient(to_left,transparent,#000_24px,#000_calc(100%-24px),transparent)]",
          scrolled ? "border-t border-border" : "border-t border-transparent",
        )}
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
                "flex h-11 min-h-11 shrink-0 items-center rounded-[8px] px-3 text-[13px] transition-colors",
                isActive ? "bg-site-100 font-semibold text-fg" : "text-muted hover:text-fg",
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
