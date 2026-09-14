import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";

const PLATFORM_LINKS = [
  { to: "/", label: "خانه" },
  { to: "/ask", label: "پرسش حقوقی" },
  { to: "/residency", label: "پرسش اقامتی" },
  { to: "/forms", label: "برگه‌ها و دادرسی" },
  { to: "/sources", label: "منابع و روش‌شناسی" },
  { to: "/about", label: "درباره ما" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border-soft bg-surface/60">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div>
          <BrandMark size="sm" subtitle={null} />
          <p className="mt-3 text-[12.5px] leading-7 text-subtle">
            {BRAND.name} — دستیار حقوقی و اقامتی، بر اساس متن قانون و اسناد
            رسمی، زیر نظر دکتر سیداکبر موسوی، وکیل پایه‌یک دادگستری، عضو
            کانون وکلای مرکز.
          </p>
        </div>

        <nav aria-labelledby="footer-platform">
          <h2 id="footer-platform" className="mb-3 text-[12.5px] font-bold text-fg">
            پلتفرم
          </h2>
          <ul className="grid gap-1 text-[12.5px] text-muted">
            {PLATFORM_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="inline-flex min-h-9 items-center rounded transition-colors hover:text-fg"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-[12.5px] font-bold text-fg">ارتباط</h2>
          <ul className="grid gap-1 text-[12.5px] text-muted">
            <li>
              <a
                href="mailto:akbarmousavi1356@gmail.com"
                className="inline-flex min-h-9 items-center rounded transition-colors hover:text-fg"
                dir="ltr"
              >
                akbarmousavi1356@gmail.com
              </a>
            </li>
            <li>
              <a
                href="tel:+989122168512"
                className="inline-flex min-h-9 items-center rounded transition-colors hover:text-fg"
              >
                ۰۹۱۲۲۱۶۸۵۱۲
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/989122168512"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center rounded transition-colors hover:text-fg"
              >
                واتس‌اپ
                <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/s.a.mousavi56/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center rounded transition-colors hover:text-fg"
              >
                اینستاگرام
                <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
              </a>
            </li>
            <li>
              <Link
                to="/contact"
                className="inline-flex min-h-9 items-center rounded transition-colors hover:text-fg"
              >
                فرم تماس
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border-soft px-4 py-5 text-center text-[11.5px] text-subtle">
        © ۲۰۲۶ {BRAND.name}
      </div>
    </footer>
  );
}
