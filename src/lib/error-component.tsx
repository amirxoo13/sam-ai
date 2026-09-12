import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">خطایی رخ داد</h1>
      <p className="max-w-md text-sm leading-6 text-muted">
        بارگذاری این صفحه کامل نشد. صفحه را دوباره بارگذاری کنید یا با دفتر مؤسسه تماس بگیرید.
      </p>
      <p className="max-w-md text-xs text-subtle">
        {error instanceof Error ? error.message : "خطای پیش‌بینی‌نشده"}
      </p>
    </main>
  );
}
