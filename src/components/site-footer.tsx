import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";

/**
 * فوتر پهن و ستونی، دسته‌بندی‌شده بر اساس «کاربر دنبال چه می‌گردد»، نه
 * بر اساس ساختار فنی پروژه.
 *
 * فقط مسیرهایی که واقعاً در routeTree وجود دارند اینجا می‌آیند. لینک به
 * صفحه‌ای که ساخته نشده (حریم خصوصی، شرایط استفاده و…) اضافه نشده است.
 */
const PRODUCT_LINKS = [
  { to: "/ask", label: "پرسش حقوقی ایران" },
  { to: "/residency", label: "پرسش اقامتی" },
  { to: "/forms", label: "تنظیم برگه و لایحه" },
  { to: "/profile", label: "پرونده‌های من" },
] as const;

const COMPANY_LINKS = [
  { to: "/sources", label: "منابع و روش‌شناسی" },
  { to: "/about", label: "درباره ما" },
  { to: "/contact", label: "فرم تماس" },
] as const;

const EXTERNAL_LINKS = [
  { href: "https://wa.me/989122168512", label: "واتس‌اپ" },
  { href: "https://www.instagram.com/s.a.mousavi56/", label: "اینستاگرام" },
] as const;

function FooterColumn({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="text-[12.5px] font-semibold text-fg">
        {title}
      </h2>
      <ul className="mt-3 grid gap-0.5 text-[13px]">{children}</ul>
    </nav>
  );
}

const itemClass =
  "inline-flex min-h-9 items-center rounded-sm text-muted transition-colors hover:text-fg";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-n100">
      <div className="container-wide grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <BrandMark size="sm" subtitle={null} />
          <p className="t-caption mt-4 text-muted">
            {BRAND.name} — دستیار حقوقی و اقامتی، بر اساس متن قانون و اسناد رسمی،
            زیر نظر دکتر سیداکبر موسوی، وکیل پایه‌یک دادگستری، عضو کانون وکلای
            مرکز.
          </p>
        </div>

        <FooterColumn id="footer-product" title="محصول">
          {PRODUCT_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={itemClass}>
                {l.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn id="footer-company" title="مؤسسه">
          {COMPANY_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={itemClass}>
                {l.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn id="footer-contact" title="ارتباط">
          <li>
            <a href="tel:+989122168512" className={itemClass}>
              ۰۹۱۲۲۱۶۸۵۱۲
            </a>
          </li>
          <li>
            <a
              href="mailto:akbarmousavi1356@gmail.com"
              className={itemClass}
              dir="ltr"
            >
              akbarmousavi1356@gmail.com
            </a>
          </li>
          {EXTERNAL_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className={itemClass}>
                {l.label}
                <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
              </a>
            </li>
          ))}
        </FooterColumn>
      </div>

      <div className="border-t border-border">
        <div className="container-wide flex flex-col items-center justify-between gap-2 py-5 text-[11.5px] text-subtle sm:flex-row">
          <p>© ۲۰۲۶ {BRAND.name}</p>
          <p>
            این سامانه مشاورهٔ حقوقی نیست و رابطهٔ وکیل–موکل ایجاد نمی‌کند.
          </p>
        </div>
      </div>
    </footer>
  );
}
