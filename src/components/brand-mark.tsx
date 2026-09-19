import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * آرم مشترک برند.
 *
 * پیش‌تر هدر، فوتر و صفحهٔ ورود هر کدام نسخهٔ دستی خودشان را از آرم
 * می‌ساختند با اندازه و box-shadow متفاوت. یک کامپوننت، سه اندازهٔ تعریف‌شده.
 *
 * نوشتار فارسی‌محور است چون کل محصول فارسی و RTL است؛ آرم لاتین فقط در
 * لایهٔ دسترسی‌پذیری و متادیتا می‌ماند.
 */

const SIZES = {
  sm: { img: "size-8", name: "text-[15px]", sub: "text-[10.5px]" },
  md: { img: "size-9", name: "text-[17px]", sub: "text-[11px]" },
  lg: { img: "size-14", name: "text-[26px]", sub: "text-[13px]" },
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
        width={56}
        height={56}
        className={cn(s.img, "shrink-0 rounded-[8px] object-cover ring-1 ring-border")}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn(s.name, "font-extrabold tracking-tight text-fg")}>
          {BRAND.short}
        </span>
        {sub ? (
          <span className={cn(s.sub, "hidden truncate text-muted sm:block")}>{sub}</span>
        ) : null}
      </span>
    </span>
  );
}
