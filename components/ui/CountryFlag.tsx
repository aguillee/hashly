import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "w-4 h-3",
  sm: "w-5 h-3.5",
  md: "w-6 h-4",
  lg: "w-8 h-6",
};

export function CountryFlag({ code, size = "sm", className }: CountryFlagProps) {
  const src = `https://flagcdn.com/${code.toLowerCase()}.svg`;

  return (
    <img
      src={src}
      alt={code}
      className={cn(SIZES[size], "inline-block rounded-[2px] object-cover", className)}
      loading="lazy"
    />
  );
}
