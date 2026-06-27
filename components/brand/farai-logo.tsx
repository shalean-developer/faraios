import Image from "next/image";

import {
  FARAIOS_LOGO_HEIGHT,
  FARAIOS_LOGO_SRC,
  FARAIOS_LOGO_WIDTH,
} from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

type FaraiLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: "sm" | "header" | "md" | "lg";
  /** Invert colors for dark backgrounds (e.g. auth panel). */
  onDark?: boolean;
  onError?: () => void;
};

/** Height-led sizing for the full wordmark in `public/image/faraios-logo.png`. */
const logoSizeClasses = {
  sm: "h-9 w-auto max-w-[200px]",
  header: "h-10 w-auto max-w-[220px]",
  md: "h-11 w-auto max-w-[260px]",
  lg: "h-12 w-auto max-w-[320px]",
} as const;

export function FaraiLogo({
  className,
  imageClassName,
  priority = false,
  size = "md",
  onDark = false,
  onError,
}: FaraiLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={FARAIOS_LOGO_SRC}
        alt="FaraiOS"
        width={FARAIOS_LOGO_WIDTH}
        height={FARAIOS_LOGO_HEIGHT}
        priority={priority}
        unoptimized
        onError={onError}
        className={cn(
          logoSizeClasses[size],
          "block shrink-0 object-contain object-left",
          onDark && "brightness-0 invert",
          imageClassName
        )}
      />
    </span>
  );
}
