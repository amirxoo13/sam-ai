import type { ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * طبق خواسته‌ی صریح کاربر: «تا صفحه کاربری نداشته باشن اجازه استفاده از هوش
 * را نداشته باشند» — این کامپوننت دور هر صفحه‌ای که به AI وصل است (چت حقوقی،
 * چت اقامتی، برگه‌ها) کشیده می‌شود. تا نشستِ کاربر resolve نشده هیچ‌چیز نشان
 * نمی‌دهد (تا فلاش نادرست رخ ندهد)، و اگر کاربر واردنشده باشد به /login
 * می‌فرستد.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
