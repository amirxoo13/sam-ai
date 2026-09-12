import type { ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

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
    return <Navigate to="/login" search={{ next: pathname }} />;
  }
  return <>{children}</>;
}
