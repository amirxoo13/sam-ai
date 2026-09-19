import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";

const PLATFORM = [
  { to: "/ask", label: "پرسش حقوقی" },
  { to: "/residency", label: "پرسش اقامتی" },
  { to: "/forms", label: "برگه‌ها و دادرسی" },
  { to: "/profile", label: "پرونده‌های من" },
] as const;

const RESOURCES = [
  { to: "/sources", label: "منابع و روش‌شناسی" },
  { to: "/about", label: "درباره‌ی اها" },
  { to: "/terms", label: "شرایط استفاده" },
  { to: "/privacy", label: "حریم خصوصی" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-site-200 bg-site-100">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-1">
          <BrandMark size="sm" />
          <p className="mt-4 max-w-xs text-[14px] leading-7 text-site-600">
            دستیار حقوقی و اقامتی، بر پایه‌ی متن قانون و اسناد رسمی، با ارجاع
            قابل راستی‌آزمایی.
          </p>
        </div>

        <nav aria-labelledby="footer-platform">
          <h2 id="footer-platform" className="mb-4 text-[13px] font-semibold text-site-950">
            پلتفرم
          </h2>
          <ul className="grid gap-1 text-[14px] text-site-600">
            {PLATFORM.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-resources">
          <h2 id="footer-resources" className="mb-4 text-[13px] font-semibold text-site-950">
            منابع
          </h2>
          <ul className="grid gap-1 text-[14px] text-site-600">
            {RESOURCES.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-[13px] font-semibold text-site-950">ارتباط</h2>
          <ul className="grid gap-1 text-[14px] text-site-600">
            <li>
              <a
                href="mailto:akbarmousavi1356@gmail.com"
                className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
                dir="ltr"
              >
                akbarmousavi1356@gmail.com
              </a>
            </li>
            <li>
              <a
                href="tel:+989122168512"
                className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
              >
                ۰۹۱۲۲۱۶۸۵۱۲
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/989122168512"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
              >
                واتس‌اپ
                <span className="sr-only"> (باز شدن در زبانه‌ی جدید)</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/s.a.mousavi56/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
              >
                اینستاگرام
                <span className="sr-only"> (باز شدن در زبانه‌ی جدید)</span>
              </a>
            </li>
            <li>
              <Link
                to="/contact"
                className="inline-flex min-h-9 items-center rounded-site transition-colors hover:text-site-950"
              >
                فرم تماس
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-site-200">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-6 py-6 text-[13px] text-site-500 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>© ۲۰۲۶ {BRAND.name}</p>
          <p>
            این سامانه جایگزین مشاوره‌ی حقوقی رسمی و رابطه‌ی وکیل–موکل نیست.
          </p>
        </div>
      </div>
    </footer>
  );
}
