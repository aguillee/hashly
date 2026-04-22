import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Arc-flavored: squared-off (6px radius, not pills), single border, tinted fills.
// No more double borders (the original had `border` set twice).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[6px] text-xs font-medium tracking-tight transition-colors duration-150",
  {
    variants: {
      variant: {
        default: "bg-bg-secondary text-text-secondary border border-[var(--card-border)]",
        secondary: "bg-bg-secondary text-text-secondary border border-[var(--card-border)]",
        brand: "bg-brand/10 text-brand border border-brand/20",
        success: "bg-success/10 text-success border border-success/20",
        error: "bg-error/10 text-error border border-error/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        outline: "border border-[var(--card-border)] text-text-secondary",
        ghost: "text-text-secondary",
        live: "bg-success/10 text-success border border-success/20",
        coral: "bg-accent-coral/10 text-accent-coral border border-accent-coral/20",
        purple: "bg-accent-coral/10 text-accent-coral border border-accent-coral/20",
      },
      size: {
        default: "px-2 py-0.5 text-[11px]",
        sm: "px-1.5 py-[1px] text-[10px] rounded-[5px]",
        lg: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
