import Image from "next/image";

import {
  FARAIOS_BRAND_NAME,
  SHALEAN_LOGO_HEIGHT,
  SHALEAN_LOGO_SRC,
  SHALEAN_LOGO_WIDTH,
} from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

type FaraiLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: "sm" | "header" | "md" | "lg";
  /** Show a separate text wordmark beside the logo image. Off by default — the image includes the wordmark. */
  showWordmark?: boolean;
  /** Invert colors for dark backgrounds (e.g. auth panel). */
  onDark?: boolean;
  onError?: () => void;
};

const logoSizeClasses = {
  sm: "h-8 w-auto max-w-[160px]",
  header: "h-11 w-auto max-h-11 max-w-[220px]",
  md: "h-10 w-auto max-w-[200px]",
  lg: "h-12 w-auto max-w-[240px]",
} as const;

const wordmarkSizeClasses = {
  sm: "text-base",
  header: "text-xl",
  md: "text-lg",
  lg: "text-2xl",
} as const;

export function FaraiLogo({
  className,
  imageClassName,
  priority = false,
  size = "md",
  showWordmark = false,
  onDark = false,
  onError,
}: FaraiLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={SHALEAN_LOGO_SRC}
        alt="Shalean"
        width={SHALEAN_LOGO_WIDTH}
        height={SHALEAN_LOGO_HEIGHT}
        priority={priority}
        onError={onError}
        className={cn(
          logoSizeClasses[size],
          "shrink-0 object-contain object-left",
          onDark && "brightness-0 invert",
          imageClassName
        )}
      />
      {showWordmark ? (
        <span
          className={cn(
            "font-bold tracking-tight",
            wordmarkSizeClasses[size],
            onDark ? "text-white" : "text-slate-900"
          )}
        >
          {FARAIOS_BRAND_NAME}
        </span>
      ) : null}
    </span>
  );
}
