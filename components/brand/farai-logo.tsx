import Image from "next/image";

import { FARAIOS_LOGO_SRC } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

type FaraiLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: "sm" | "header" | "md" | "lg";
  /** Invert colors for dark backgrounds (e.g. footer, auth panel). */
  onDark?: boolean;
  onError?: () => void;
};

const sizeClasses = {
  sm: "h-8 w-auto",
  header: "h-14 w-auto max-h-14",
  md: "h-10 w-auto",
  lg: "h-14 w-auto",
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
        width={160}
        height={48}
        priority={priority}
        onError={onError}
        className={cn(
          sizeClasses[size],
          "object-contain object-left",
          onDark && "brightness-0 invert",
          imageClassName
        )}
      />
    </span>
  );
}
