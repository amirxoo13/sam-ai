import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { HamburgerButton, MobileNavPanel } from "@/components/mobile-nav";
import { SITE_NAV, type NavKey } from "@/components/site-nav";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

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
    "inline-flex h-11 min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] bg-fg px-3 text-[13px] font-bold text-accent-fg transition-colors hover:bg-site-800 sm:h-12 sm:min-h-12 sm:px-5 sm:text-[14px]",
    className,
  );
  const short = label === BRAND.cta ? BRAND.ctaShort : label;
  const inner = (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
    </>
  );
  return user ? (
    <Link to="/ask" className={cls}>
      {inner}
    </Link>
  ) : (
    <Link to="/login" search={{ next: "/ask" }} className={cls}>
      {inner}
    </Link>
  );
}

export function MarketingHeader({ active }: { active?: NavKey }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideCta = pathname === "/login" || pathname === "/forgot" || pathname === "/reset";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="پیوندهای اصلی">
          {SITE_NAV.map((link) => {
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
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-2 h-px bg-fg" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          {hideCta ? null : <PrimaryCta />}
          <HamburgerButton open={open} onToggle={() => setOpen((v) => !v)} controlsId={menuId} />
        </div>
      </div>

      <MobileNavPanel id={menuId} open={open} onClose={() => setOpen(false)} active={active} />
    </header>
  );
}
