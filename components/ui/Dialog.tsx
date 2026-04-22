"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — softer, warmer dark, blur + faint brand tint */}
      <div
        className="absolute inset-0 bg-[#05070A]/70 backdrop-blur-[6px] animate-fade-in"
        onClick={onClose}
      />
      {/* Content — larger radius on desktop, spring slide-up on mobile */}
      <div
        className={cn(
          "relative z-10 w-full max-h-[85vh] overflow-y-auto",
          "bg-bg-card border border-[var(--card-border)]",
          "shadow-[0_24px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(58,204,184,0.06)]",
          "rounded-t-2xl sm:rounded-[16px] sm:max-w-md sm:mx-4",
          "animate-slide-up sm:animate-scale-in",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export function DialogHeader({ children, onClose }: DialogHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
      <h2 className="text-[15px] font-semibold text-text-primary tracking-tight">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1.5 -mr-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors duration-150 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)]", className)}>
      {children}
    </div>
  );
}
