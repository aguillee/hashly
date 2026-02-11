import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-3 py-1 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "rounded-md bg-accent-primary text-white",
        secondary: "rounded-md bg-bg-secondary text-text-secondary border border-border",
        success: "rounded-md bg-green-600 text-white",
        error: "rounded-md bg-red-600 text-white",
        warning: "rounded-md bg-amber-500 text-white",
        coral: "rounded-md bg-accent-coral text-white",
        outline: "rounded-md border-2 border-border text-text-secondary hover:border-accent-primary/50",
        ghost: "rounded-md bg-bg-card/50 text-text-secondary backdrop-blur-sm",
        live: "rounded-md bg-green-600 text-white animate-pulse",
        purple: "rounded-md bg-purple-600 text-white",
        skew: "skew-tag bg-accent-primary text-white font-bold tracking-wide",
        skewLive: "skew-tag bg-green-600 text-white font-bold tracking-wide",
        skewPurple: "skew-tag bg-purple-600 text-white font-bold tracking-wide",
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
