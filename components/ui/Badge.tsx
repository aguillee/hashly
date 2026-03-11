import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md text-xs font-medium transition-colors duration-150 border border-black/5 dark:border-white/5",
  {
    variants: {
      variant: {
        default: "bg-bg-secondary text-text-secondary border border-border",
        secondary: "bg-bg-secondary text-text-secondary border border-border",
        brand: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
        success: "bg-green-500/10 text-green-700 dark:text-green-400",
        error: "bg-red-500/10 text-red-700 dark:text-red-400",
        warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        outline: "border border-border text-text-secondary",
        ghost: "text-text-secondary",
        live: "bg-green-500/10 text-green-700 dark:text-green-400",
        coral: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        purple: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
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
