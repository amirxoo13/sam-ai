/**
 * پیش‌نمایش‌های رابط محصول برای لندینگ.
 *
 * این‌ها خروجی زندهٔ مدل نیستند. متن ماده ۱۰ قانون مدنی از متن رسمی قانون
 * است؛ ظاهر حباب‌ها و کارت استناد همان رابط واقعی /ask و /forms است.
 * در UI با برچسب «پیش‌نمایش رابط» مشخص شده‌اند.
 */
import type { ReactNode } from "react";
import { PreviewBadge } from "@/components/product/citation-chip";
import { BRAND } from "@/lib/brand";

function WindowChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="product-window">
      <div className="flex items-center gap-3 border-b border-border bg-site-50 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-site-300" />
          <span className="size-2 rounded-full bg-site-300" />
          <span className="size-2 rounded-full bg-site-300" />
        </div>
        <p className="min-w-0 truncate text-[12px] font-medium text-site-600">{title}</p>
      </div>
      {children}
    </div>
  );
}

function PreviewNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[12.5px] leading-6 text-site-500">{children}</p>;
}

export function AskConversationPreview({ caption = true }: { caption?: boolean }) {
  return (
    <figure className="m-0">
      <WindowChrome title={`${BRAND.short} · پرسش حقوقی`}>
        <div className="space-y-4 bg-surface p-4 sm:p-5">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[8px] rounded-ss-[2px] bg-site-100 px-4 py-3 text-[13.5px] leading-7 text-fg">
              ماده ۱۰ قانون مدنی چه می‌گوید؟
            </div>
          </div>
          <article className="rounded-[12px] border border-border bg-elevated p-4">
            <p className="text-[11.5px] font-medium tracking-wide text-muted">
              {BRAND.short} — پاسخ مستند
            </p>
            <p className="mt-2 text-[13.5px] leading-7 text-fg">
              ماده ۱۰ قانون مدنی می‌گوید قراردادهای خصوصی نسبت به کسانی که آن را
              منعقد نموده‌اند، در صورتی که مخالف صریح قانون نباشد، نافذ است. یعنی
              اصل بر اعتبار توافق طرفین است مگر آنجا که قانون صریحاً منع کرده باشد.
            </p>
            <p className="mt-3 text-[11.5px] font-medium text-muted">منابع استنادی</p>
            <div className="mt-2">
              <PreviewBadge
                law="قانون مدنی"
                article="ماده ۱۰"
                kind="مادهٔ دقیق"
                percent="۱۰۰٪"
              />
            </div>
            <p className="mt-3 text-[11.5px] leading-5 text-subtle">
              این خدمت مشاورهٔ حقوقی محسوب نمی‌شود و رابطهٔ وکیل–موکل ایجاد نمی‌کند.
            </p>
          </article>
          <div className="flex items-end gap-2 rounded-[8px] border border-border bg-elevated p-2">
            <div className="min-h-11 flex-1 px-3 py-2.5 text-[13px] text-subtle">
              پرسش حقوقی خود را با نام قانون و شماره ماده بنویسید…
            </div>
            <div
              className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-fg text-accent-fg"
              aria-hidden="true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </WindowChrome>
      {caption ? (
        <PreviewNote>
          پیش‌نمایش رابط محصول — متن ماده از قانون مدنی است، نه خروجی زندهٔ مدل.
        </PreviewNote>
      ) : null}
    </figure>
  );
}

export function LawyerAudiencePreview() {
  return (
    <WindowChrome title="برای وکلا و کارآموزان">
      <div className="space-y-3 bg-surface p-4">
        <p className="text-[12.5px] leading-6 text-muted">
          اصل ۳۵ قانون اساسی دربارهٔ حق داشتن وکیل چیست؟
        </p>
        <PreviewBadge
          law="قانون اساسی"
          article="اصل ۳۵"
          kind="مادهٔ دقیق"
          percent="۱۰۰٪"
        />
        <p className="text-[12.5px] leading-6 text-fg">
          در همهٔ دادگاه‌ها طرفین حق دارند برای خود وکیل انتخاب نمایند…
        </p>
      </div>
    </WindowChrome>
  );
}

export function IndividualAudiencePreview() {
  return (
    <WindowChrome title="دادخواست مطالبه مهریه">
      <div className="space-y-3 bg-surface p-4">
        <p className="text-[11px] font-medium text-muted">پیش‌نویس · مسیر حقوقی</p>
        <p className="text-[13px] font-bold leading-6 text-fg">
          ریاست محترم دادگاه خانوادهٔ شهرستان تهران
        </p>
        <p className="text-[12.5px] leading-6 text-muted">
          خواسته: محکومیت خوانده به پرداخت مهریه طبق سند نکاحیه.
        </p>
        <PreviewBadge
          law="قانون حمایت خانواده"
          article="ماده ۲۹"
          kind="مادهٔ دقیق"
          percent="۱۰۰٪"
        />
      </div>
    </WindowChrome>
  );
}

export function ResidencyAudiencePreview() {
  return (
    <WindowChrome title="پرسش اقامتی · ایالات متحده">
      <div className="space-y-3 bg-surface p-4">
        <p className="self-end rounded-[8px] bg-site-100 px-3 py-2 text-[12.5px] leading-6 text-fg">
          شرایط ویزای کار H-1B چیست؟
        </p>
        <PreviewBadge
          law="8 C.F.R. § 214.2(h)"
          article="H-1B"
          kind="تطبیق متنی"
          percent="اسناد رسمی"
        />
        <p className="text-[12.5px] leading-6 text-muted">
          پاسخ از eCFR و Federal Register بازیابی می‌شود، نه از تفسیر عمومی.
        </p>
      </div>
    </WindowChrome>
  );
}

export function ExactMatchPreview() {
  return (
    <WindowChrome title="تطبیق مادهٔ دقیق">
      <div className="space-y-3 bg-surface p-4">
        <p className="text-[12.5px] text-muted">ورودی: «ماده ۱۰ قانون مدنی»</p>
        <PreviewBadge
          law="قانون مدنی"
          article="ماده ۱۰"
          kind="مادهٔ دقیق"
          percent="۱۰۰٪"
        />
        <p className="text-[13px] leading-7 text-fg">
          قراردادهای خصوصی نسبت به کسانی که آن را منعقد نموده‌اند در صورتی که
          مخالف صریح قانون نباشد نافذ است.
        </p>
      </div>
    </WindowChrome>
  );
}

export function SearchRankPreview() {
  return (
    <WindowChrome title="رتبه‌بندی بر اساس الزام‌آوری">
      <ol className="space-y-2 bg-surface p-4">
        {[
          { n: "۱", t: "قانون مدنی — ماده ۱۹۰", k: "قانون موضوعه" },
          { n: "۲", t: "رأی وحدت رویه ۷۳۳", k: "الزام‌آور" },
          { n: "۳", t: "نظریه مشورتی ۷/۱۴۰۲", k: "ارشادی" },
        ].map((row) => (
          <li
            key={row.n}
            className="flex items-center justify-between rounded-[8px] border border-border bg-elevated px-3 py-2.5"
          >
            <span className="text-[13px] font-medium text-fg">{row.t}</span>
            <span className="text-[11.5px] text-muted">{row.k}</span>
          </li>
        ))}
      </ol>
    </WindowChrome>
  );
}

export function VerifyPreview() {
  return (
    <WindowChrome title="راستی‌آزمایی استناد">
      <ul className="space-y-2 bg-surface p-4">
        <li className="rounded-[8px] border border-border bg-elevated px-3 py-2.5">
          <p className="text-[13px] font-semibold text-fg">قانون مدنی — ماده ۱۰</p>
          <p className="mt-1 text-[12px] text-success">استناد تأییدشده در منبع بازیابی‌شده</p>
        </li>
        <li className="rounded-[8px] border border-border bg-elevated px-3 py-2.5">
          <p className="text-[13px] font-semibold text-fg">ماده ۹۹۹</p>
          <p className="mt-1 text-[12px] text-danger">استناد تأییدنشده — در پیکره نبود</p>
        </li>
      </ul>
    </WindowChrome>
  );
}

export function MatterPreview() {
  return (
    <WindowChrome title="پرونده به‌عنوان شیء کاری">
      <div className="space-y-3 bg-surface p-4">
        <div className="rounded-[8px] border border-dashed border-border bg-elevated px-3 py-3">
          <p className="text-[13px] font-medium text-fg">dadkhast-mehrieh.txt</p>
          <p className="mt-1 text-[12px] text-muted">۱۲ کیلوبایت · فقط بند مرتبط بازیابی می‌شود</p>
        </div>
        <p className="text-[12.5px] leading-6 text-subtle">
          کل پرونده به مدل ریخته نمی‌شود. سامانه بند مرتبط با پرسش را جدا می‌کند.
        </p>
      </div>
    </WindowChrome>
  );
}

export function AuditPreview() {
  return (
    <WindowChrome title="مسیر بازیابی، آشکار">
      <dl className="grid grid-cols-2 gap-3 bg-surface p-4 text-[13px]">
        <div>
          <dt className="text-muted">نوع تطبیق</dt>
          <dd className="mt-1 font-semibold text-fg">مادهٔ دقیق</dd>
        </div>
        <div>
          <dt className="text-muted">استناد تأییدشده</dt>
          <dd className="mt-1 font-semibold text-fg">۱ از ۱</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">شناسهٔ ممیزی</dt>
          <dd className="mt-1 font-mono text-[12px] text-fg" dir="ltr">
            aha-7f3c9b12
          </dd>
        </div>
      </dl>
    </WindowChrome>
  );
}

export const CAPABILITY_PREVIEWS = [
  ExactMatchPreview,
  SearchRankPreview,
  VerifyPreview,
  MatterPreview,
  AuditPreview,
] as const;
