import { Link } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { SamMark } from "@/components/sam-mark";
import { cn } from "@/lib/utils";

export function AppHeader({
  corpusLabel,
  active,
}: {
  corpusLabel?: string;
  active: "ask" | "forms";
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-accent"
          aria-label="SAM AI"
        >
          <SamMark className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold tracking-tight">SAM AI</h1>
            <span className="hidden text-xs text-subtle sm:inline">
              Smart Attorney Mind
            </span>
          </div>
          <p className="truncate text-xs text-muted">
            {corpusLabel ?? "برگه‌ها و لوایح قضایی"}
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg bg-surface p-1" aria-label="بخش">
          <Link
            to="/"
            className={cn(
              "flex h-11 min-h-11 items-center px-3 text-sm rounded-md",
              active === "ask" ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            پرسش
          </Link>
          <Link
            to="/forms"
            className={cn(
              "flex h-11 min-h-11 items-center px-3 text-sm rounded-md",
              active === "forms" ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            برگه‌ها
          </Link>
        </nav>
        <Scale className="hidden size-4 shrink-0 text-subtle sm:block" aria-hidden />
      </div>
    </header>
  );
}
