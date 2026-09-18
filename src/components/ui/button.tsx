import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * دکمهٔ پایه.
 *
 * انضباط عمدی: دکمهٔ اصلی «بلوک بازاریابی» نیست — کوتاه، با شعاع ۴
 * پیکسل، وزن ۵۰۰ و فقط دو سر رمپ خنثی (جوهر روی عاج). نه گرادیان، نه
 * سایهٔ رنگی، نه scale در حالت active. اعتبار بصری از تضاد و فاصله
 * می‌آید، نه از تزئین.
 *
 * نام واریانت‌ها (از جمله `premium`) عمداً دست‌نخورده مانده است: در
 * forms.tsx شش فراخوانی به آن وجود دارد و تغییر نام یعنی تغییر بی‌دلیل
 * در فایل‌هایی که کارشان درست است. `premium` حالا همان دکمهٔ اصلی است.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-n900 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-fg text-bg hover:bg-n800",
        /** مترادف دکمهٔ اصلی — رجوع به توضیح بالا. */
        premium: "bg-fg text-bg hover:bg-n800",
        secondary:
          "border border-border bg-elevated-2 text-fg hover:border-n300 hover:bg-elevated",
        ghost: "text-muted hover:bg-elevated hover:text-fg",
        outline: "border border-n300 bg-transparent text-fg hover:bg-elevated",
      },
      size: {
        default: "control-h px-3.5 text-sm",
        lg: "control-h-lg px-5 text-[15px]",
        sm: "h-9 min-h-9 px-3 text-[13px]",
        icon: "control-h w-10 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { buttonVariants };
