import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              // Arc-flavored: soft inner shadow, 10px radius, teal focus halo
              "flex h-10 w-full rounded-[10px] bg-bg-card px-3.5 py-2 text-sm text-text-primary",
              "border border-[var(--card-border)]",
              "shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]",
              "placeholder:text-text-tertiary",
              "transition-[border-color,box-shadow] duration-150 ease-out",
              "focus-visible:outline-none focus-visible:border-brand/60 focus-visible:shadow-[0_0_0_3px_rgba(58,204,184,0.18),0_1px_0_rgba(255,255,255,0.02)_inset]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-error/60 focus-visible:border-error focus-visible:shadow-[0_0_0_3px_rgba(251,113,133,0.18)]"
                : "hover:border-[var(--card-border-hover)]",
              icon && "pl-10",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-error font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
