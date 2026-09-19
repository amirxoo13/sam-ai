import { Link } from "@tanstack/react-router";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { BRAND } from "@/lib/brand";

export function NotFoundPage() {
  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader />
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-[12px] font-semibold tracking-[0.18em] text-site-500">۴۰۴</p>
        <h1 className="mt-3 text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg">
          این صفحه پیدا نشد
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-muted">
          نشانی واردشده در {BRAND.name} وجود ندارد یا جابه‌جا شده است. می‌توانید به
          خانه برگردید یا از فهرست بالا بخش موردنظر را باز کنید.
        </p>
        <p className="mt-8">
          <Link
            to="/"
            className="inline-flex h-12 min-h-12 items-center justify-center rounded-[8px] bg-fg px-6 text-[14.5px] font-bold text-accent-fg hover:bg-site-800"
          >
            بازگشت به خانه
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
