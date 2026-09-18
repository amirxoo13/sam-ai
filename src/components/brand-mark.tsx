import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * آرم مشترک برند.
 *
 * یک کامپوننت، سه اندازهٔ تعریف‌شده — تا هدر، فوتر و صفحهٔ ورود هرکدام
 * نسخهٔ دستی خودشان را نسازند.
 *
 * نوشتار فارسی‌محور است چون کل محصول فارسی و RTL است؛ آرم لاتین فقط در
 * لایهٔ دسترسی‌پذیری و متادیتا می‌ماند.
 *
 * نقطهٔ فیروزه‌ایِ بعد از نام حذف شد: در پوسته‌ای که هیچ رنگ اکسنتی
 * ندارد، یک نقطهٔ رنگی تنها، دقیقاً همان جزئی است که چشم را می‌گیرد و
 * ظاهر را «استارتاپی» می‌کند. وزن نام هم از extrabold به ۵۵۰ آمد تا با
 * مقیاس تایپوگرافی ویرایشی هم‌خانواده شود.
 */

const SIZES = {
  sm: { img: "size-7", name: "text-[15px]", sub: "text-[10.5px]" },
  md: { img: "size-9", name: "text-[18px]", sub: "text-[11px]" },
  lg: { img: "size-12", name: "text-[24px]", sub: "text-[12.5px]" },
} as const;

export function BrandMark({
  size = "md",
  subtitle,
  className,
}: {
  size?: keyof typeof SIZES;
  /** خط دوم زیر آرم. اگر null باشد چیزی نشان داده نمی‌شود. */
  subtitle?: string | null;
  className?: string;
}) {
  const s = SIZES[size];
  const sub = subtitle === undefined ? BRAND.tagline : subtitle;
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        src={BRAND.logoSrc}
        alt=""
        width={48}
        height={48}
        className={cn(s.img, "shrink-0 rounded-sm object-cover ring-1 ring-border")}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn(s.name, "font-semibold tracking-[-0.01em] text-fg")}>
          {BRAND.short}
        </span>
        {sub ? (
          <span className={cn(s.sub, "truncate font-normal text-subtle")}>{sub}</span>
        ) : null}
      </span>
    </span>
  );
}
