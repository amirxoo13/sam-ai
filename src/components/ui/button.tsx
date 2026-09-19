import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-semibold transition-[color,background-color,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-fg text-accent-fg hover:bg-site-800",
        premium: "bg-fg text-accent-fg hover:bg-site-800",
        secondary:
          "border border-border bg-elevated text-fg hover:border-site-400 hover:bg-site-50",
        ghost: "text-muted hover:bg-site-100 hover:text-fg",
        outline: "border border-border bg-transparent text-fg hover:bg-site-100",
      },
      size: {
        default: "h-11 min-h-11 px-4",
        lg: "h-12 min-h-12 px-5 text-[15px]",
        sm: "h-9 min-h-9 px-3 text-xs font-medium",
        icon: "size-11 min-h-11 min-w-11",
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
