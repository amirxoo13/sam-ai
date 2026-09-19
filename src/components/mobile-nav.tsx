import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SITE_NAV, type NavKey } from "@/components/site-nav";
import { cn } from "@/lib/utils";

export function HamburgerButton({
  open,
  onToggle,
  controlsId,
}: {
  open: boolean;
  onToggle: () => void;
  controlsId: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[8px] border border-border bg-elevated text-fg lg:hidden"
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={open ? "بستن فهرست" : "باز کردن فهرست"}
      onClick={onToggle}
    >
      <span className="relative block size-4" aria-hidden="true">
        <span
          className={cn(
            "absolute start-0 h-0.5 w-4 bg-current transition-transform",
            open ? "top-1.5 rotate-45" : "top-0.5",
          )}
        />
        <span
          className={cn(
            "absolute start-0 top-1.5 h-0.5 w-4 bg-current transition-opacity",
            open ? "opacity-0" : "opacity-100",
          )}
        />
        <span
          className={cn(
            "absolute start-0 h-0.5 w-4 bg-current transition-transform",
            open ? "top-1.5 -rotate-45" : "top-2.5",
          )}
        />
      </span>
    </button>
  );
}

export function MobileNavPanel({
  id,
  open,
  onClose,
  active,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  active?: NavKey;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <nav
      id={id}
      aria-label="فهرست موبایل"
      className="border-t border-border bg-bg px-4 py-3 lg:hidden"
    >
      <ul className="grid gap-1">
        {SITE_NAV.map((link) => {
          const isActive = active === link.key;
          return (
            <li key={link.to}>
              <Link
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
                className={cn(
                  "flex min-h-11 items-center rounded-[8px] px-3 text-[14px] font-medium transition-colors",
                  isActive ? "bg-site-100 text-fg" : "text-muted hover:bg-site-50 hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
