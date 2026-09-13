import type { ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const LOGIN_NEXT = ["/", "/ask", "/forms", "/residency", "/profile", "/sources", "/about", "/contact"] as const;

function returnTo(pathname: string): (typeof LOGIN_NEXT)[number] {
  return (LOGIN_NEXT as readonly string[]).includes(pathname)
    ? (pathname as (typeof LOGIN_NEXT)[number])
    : "/ask";
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted" role="status">
        در حال بررسی نشست…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" search={{ next: returnTo(pathname) }} />;
  }
  return <>{children}</>;
}
