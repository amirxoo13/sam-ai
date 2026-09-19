import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

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

export const PRIMARY_CTA_LABEL = "شروع کنید";

export function MarketingBrand({ size = "md" }: { size?: "sm" | "md" }) {
  const s =
    size === "sm"
      ? { img: "size-8", name: "text-[15px]", sub: "text-[10.5px]" }
      : { img: "size-9", name: "text-[17px]", sub: "text-[11px]" };
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <img
        src={BRAND.logoSrc}
        alt=""
        width={36}
        height={36}
        className={cn(s.img, "shrink-0 rounded-site object-cover")}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn(s.name, "font-bold tracking-tight text-site-950")}>
          {BRAND.short}
        </span>
        <span className={cn(s.sub, "truncate text-site-500")}>{BRAND.tagline}</span>
      </span>
    </span>
  );
}

export function PrimaryCta({
  className,
  label = PRIMARY_CTA_LABEL,
}: {
  className?: string;
  label?: string;
}) {
  const { user } = useCurrentUserState();
  return user ? (
    <Link
      to="/ask"
      className={cn(
        "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-site bg-site-950 px-5 text-[14px] font-medium text-site-50 transition-colors hover:bg-site-800",
        className,
      )}
    >
      {label}
    </Link>
  ) : (
    <Link
      to="/login"
      search={{ next: "/ask" }}
      className={cn(
        "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-site bg-site-950 px-5 text-[14px] font-medium text-site-50 transition-colors hover:bg-site-800",
        className,
      )}
    >
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
          ? "border-b border-site-200 bg-site-50/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-6 sm:h-24 lg:px-10">
        <Link to="/" className="shrink-0 rounded-site" aria-label={`${BRAND.name} — خانه`}>
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
                  "relative flex h-11 min-h-11 shrink-0 items-center rounded-site px-3 text-[14px] transition-colors",
                  isActive
                    ? "font-medium text-site-950"
                    : "text-site-600 hover:text-site-950",
                )}
              >
                {link.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-2 h-px bg-site-950"
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
          scrolled ? "border-t border-site-200" : "border-t border-transparent",
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
                "flex h-11 min-h-11 shrink-0 items-center rounded-site px-3 text-[13px] transition-colors",
                isActive
                  ? "bg-site-100 font-medium text-site-950"
                  : "text-site-600 hover:text-site-950",
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
