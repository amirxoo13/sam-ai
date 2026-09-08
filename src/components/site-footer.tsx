import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border-soft bg-surface/60">
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <img src="/logo.png" alt="SAM AI" width={28} height={28} className="rounded-full" />
            <span className="text-[15px] font-extrabold">
              SAM<span className="text-cyan">AI</span>
            </span>
          </div>
          <p className="text-[12.5px] leading-6 text-subtle">
            SAM AI — Smart Attorney Mind — دستیار حقوقی و اقامتی هوشمند، بر
            اساس متن قانون و اسناد رسمی، زیر نظر دکتر سیداکبر موسوی، وکیل
            پایه‌یک دادگستری، عضو کانون وکلای مرکز.
          </p>
        </div>

        <div>
          <p className="mb-3 text-[12.5px] font-bold text-fg">پلتفرم</p>
          <ul className="grid gap-2 text-[12.5px] text-muted">
            <li><Link to="/" className="hover:text-fg">خانه</Link></li>
            <li><Link to="/ask" className="hover:text-fg">پرسش حقوقی</Link></li>
            <li><Link to="/residency" className="hover:text-fg">پرسش اقامتی</Link></li>
            <li><Link to="/forms" className="hover:text-fg">برگه‌ها و دادرسی</Link></li>
            <li><Link to="/sources" className="hover:text-fg">منابع و روش‌شناسی</Link></li>
            <li><Link to="/about" className="hover:text-fg">درباره ما</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[12.5px] font-bold text-fg">ارتباط</p>
          <ul className="grid gap-2 text-[12.5px] text-muted" dir="ltr">
            <li>
              <a href="mailto:akbarmousavi1356@gmail.com" className="hover:text-fg" dir="rtl">
                akbarmousavi1356@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+989122168512" className="hover:text-fg" dir="rtl">
                ۰۹۱۲۲۱۶۸۵۱۲
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/989122168512"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fg"
                dir="rtl"
              >
                واتس‌اپ
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/s.a.mousavi56/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fg"
                dir="rtl"
              >
                اینستاگرام
              </a>
            </li>
            <li>
              <Link to="/contact" className="hover:text-fg" dir="rtl">
                فرم تماس
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border-soft px-4 py-4 text-center text-[11.5px] text-subtle">
        © ۲۰۲۶ SAM AI — Smart Attorney Mind
      </div>
    </footer>
  );
}
