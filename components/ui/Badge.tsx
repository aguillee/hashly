import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-accent-primary/15 text-accent-primary border border-accent-primary/20",
        secondary: "bg-white/5 text-text-secondary border border-border",
        success: "bg-green-500/15 text-green-400 border border-green-500/20",
        error: "bg-red-500/15 text-red-400 border border-red-500/20",
        warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        coral: "bg-accent-coral/15 text-accent-coral border border-accent-coral/20",
        outline: "border border-border text-text-secondary hover:border-accent-primary/30",
        ghost: "bg-white/5 text-text-secondary",
        live: "bg-green-500/15 text-green-400 border border-green-500/20",
        purple: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
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
