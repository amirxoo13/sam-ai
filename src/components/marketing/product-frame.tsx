import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * قاب تصویر محصول.
 *
 * چرا یک کامپوننت و نه یک <img> ساده: تا وقتی فایل تصویر وجود ندارد —
 * یا لود نمی‌شود — هیچ‌وقت یک مستطیل خاکستری خالی نشان داده نشود.
 * حالت جایگزین، یک اسکلتِ برچسب‌خورده است که می‌گوید قرار است چه چیزی
 * آن‌جا بنشیند. همین قاعده برای هر تصویر lazy دیگری هم صدق می‌کند.
 *
 * برای جایگذاری تصویر واقعی: فایل را در public/ بگذارید و مسیرش را به
 * src بدهید، مثلاً src="/shots/ask.png".
 */

export function ProductFrame({
  src,
  alt,
  label,
  caption,
  ratio = "16 / 10",
  className,
  priority = false,
}: {
  src?: string;
  alt: string;
  /** توضیح کوتاه داخل اسکلت، وقتی تصویری نیست. */
  label: string;
  /** زیرنویس بیرون قاب. */
  caption?: string;
  ratio?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <figure className={cn("m-0", className)}>
      <div
        className="overflow-hidden rounded-site border border-site-200 bg-site-100"
        style={{ aspectRatio: ratio }}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailed(true)}
            className="size-full object-cover object-top"
          />
        ) : (
          <div
            className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center"
            role="img"
            aria-label={alt}
          >
            {/* اسکلت، نه جعبه‌ی خالی: سه نوار که شکل یک پاسخ با فهرست
                منبع را تداعی می‌کنند. */}
            <div aria-hidden="true" className="w-full max-w-sm space-y-2.5">
              <div className="h-2.5 w-1/3 rounded-site bg-site-300" />
              <div className="h-2.5 w-full rounded-site bg-site-200" />
              <div className="h-2.5 w-11/12 rounded-site bg-site-200" />
              <div className="h-2.5 w-4/5 rounded-site bg-site-200" />
              <div className="mt-4 h-2.5 w-1/4 rounded-site bg-site-300" />
              <div className="h-2.5 w-2/3 rounded-site bg-site-200" />
            </div>
            <figcaption className="text-[13px] text-site-500">{label}</figcaption>
          </div>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-3 text-[13px] text-site-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
