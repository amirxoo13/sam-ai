import { useRef, type ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { returnToOrAsk } from "@/lib/auth/return-to";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const routerPathname = useRouterState({ select: (s) => s.location.pathname });
  const captured = useRef<string | null>(null);
  if (captured.current === null) {
    const fromWindow =
      typeof window !== "undefined" && window.location.pathname
        ? window.location.pathname
        : routerPathname;
    captured.current = fromWindow;
  }
  const intended =
    captured.current && captured.current !== "/login" ? captured.current : routerPathname;

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6" role="status">
        <div className="w-full max-w-sm space-y-3">
          <div className="skeleton-bar h-3 w-1/3" />
          <div className="skeleton-bar h-3 w-full" />
          <div className="skeleton-bar h-3 w-5/6" />
          <p className="pt-2 text-sm text-muted">در حال بررسی نشست…</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" search={{ next: returnToOrAsk(intended) }} replace />;
  }
  return <>{children}</>;
}
