"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Arc-flavored: 10px radius, spring active press, tinted shadows on branded
// variants, clear tier between primary / secondary / ghost.
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center whitespace-nowrap gap-2",
    "rounded-[10px] text-sm font-medium select-none",
    "transition-[background-color,color,box-shadow,transform,border-color]",
    "duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
    "active:scale-[0.97] active:duration-75",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand/60 focus-visible:ring-offset-[var(--bg-primary)]",
    "disabled:pointer-events-none disabled:opacity-45",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — brand teal with tinted glow that intensifies on hover
        default: [
          "bg-brand text-[#041512]",
          "shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-8px_rgba(58,204,184,0.6)]",
          "hover:brightness-110 hover:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_12px_28px_-8px_rgba(58,204,184,0.7)]",
        ].join(" "),
        brand: [
          "bg-brand text-[#041512]",
          "shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-8px_rgba(58,204,184,0.6)]",
          "hover:brightness-110 hover:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_14px_32px_-8px_rgba(58,204,184,0.8)]",
        ].join(" "),
        // Secondary — soft filled surface, picks up teal tint on hover
        secondary: [
          "bg-bg-secondary text-text-primary border border-[var(--card-border)]",
          "hover:bg-bg-tertiary hover:border-brand/30",
        ].join(" "),
        // Outline — bordered, transparent, hover fills faintly
        outline: [
          "bg-transparent text-text-primary border border-[var(--card-border)]",
          "hover:bg-brand/5 hover:border-brand/40 hover:text-brand",
        ].join(" "),
        // Ghost — no background, hover introduces one
        ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70",
        destructive: [
          "bg-error text-white",
          "shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-8px_rgba(251,113,133,0.55)]",
          "hover:brightness-110",
        ].join(" "),
        success: [
          "bg-success text-[#052d1f]",
          "shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_20px_-8px_rgba(52,211,153,0.55)]",
          "hover:brightness-110",
        ].join(" "),
        coral: [
          "bg-accent-coral text-white",
          "shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-8px_rgba(185,133,250,0.6)]",
          "hover:brightness-110",
        ].join(" "),
        link: "text-brand underline-offset-4 hover:underline p-0 h-auto active:scale-100",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs rounded-lg",
        lg: "h-10 px-5",
        xl: "h-12 px-7 text-base",
        icon: "h-9 w-9",
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
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="opacity-80">Working…</span>
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
