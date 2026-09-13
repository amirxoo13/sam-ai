import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-fg text-accent-fg hover:bg-fg/90",
        premium:
          "bg-[linear-gradient(135deg,var(--color-accent-light),var(--color-accent)_60%,var(--color-warn))] text-[#1a1305] shadow-[0_8px_24px_-8px_rgba(217,178,92,0.55)] hover:brightness-[1.06] active:brightness-95",
        secondary:
          "border border-border bg-elevated text-fg hover:bg-surface",
        ghost: "text-muted hover:bg-elevated hover:text-fg",
        outline: "border border-border bg-transparent text-fg hover:bg-elevated",
      },
      size: {
        default: "h-11 min-h-11 px-4",
        lg: "h-12 min-h-12 px-5 text-[15px]",
        sm: "h-9 min-h-9 px-3 text-xs",
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
