"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 btn-riffo",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/20 hover:shadow-xl hover:shadow-accent-primary/30",
        secondary:
          "bg-bg-card text-text-primary border-2 border-border hover:border-accent-primary/50 hover:bg-bg-secondary shadow-sm",
        outline:
          "border-2 border-border bg-transparent text-text-primary hover:bg-bg-card hover:border-accent-primary/50",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50",
        destructive:
          "bg-gradient-to-r from-error to-red-500 text-white shadow-lg shadow-error/20 hover:shadow-xl hover:shadow-error/30",
        success:
          "bg-gradient-to-r from-success to-emerald-400 text-white shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30",
        coral:
          "bg-gradient-to-r from-accent-coral to-red-400 text-white shadow-lg shadow-accent-coral/20 hover:shadow-xl hover:shadow-accent-coral/30",
        link: "text-accent-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 text-xs rounded-lg",
        lg: "h-13 px-7 text-base rounded-2xl",
        xl: "h-14 px-8 text-lg rounded-2xl",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
