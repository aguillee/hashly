"use client";

import { cn } from "@/lib/utils";
import { XIcon } from "@/components/ui/XIcon";

interface ShareToXButtonProps {
  shareText: string;
  shareUrl: string;
  className?: string;
}

export function ShareToXButton({ shareText, shareUrl, className }: ShareToXButtonProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  return (
    <button
      onClick={handleShare}
      title="Compartir en X"
      className={cn(
        "p-2 rounded-xl transition-all duration-300 bg-bg-secondary text-text-secondary hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]",
        className
      )}
    >
      <XIcon className="h-3.5 w-3.5" />
    </button>
  );
}
