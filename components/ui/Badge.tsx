import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-sm",
        secondary: "bg-bg-secondary text-text-secondary border border-border",
        success: "bg-gradient-to-r from-success to-emerald-400 text-white shadow-sm",
        error: "bg-gradient-to-r from-error to-red-400 text-white shadow-sm",
        warning: "bg-gradient-to-r from-warning to-amber-400 text-white shadow-sm",
        coral: "bg-gradient-to-r from-accent-coral to-red-400 text-white shadow-sm",
        outline: "border-2 border-border text-text-secondary hover:border-accent-primary/50",
        ghost: "bg-bg-card/50 text-text-secondary backdrop-blur-sm",
        live: "bg-gradient-to-r from-success to-emerald-400 text-white shadow-sm animate-pulse",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
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
