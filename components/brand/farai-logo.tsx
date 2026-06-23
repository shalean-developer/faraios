import Image from "next/image";

import { FARAIOS_LOGO_SRC } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

type FaraiLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: "sm" | "header" | "md" | "lg";
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
}: FaraiLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={FARAIOS_LOGO_SRC}
        alt="FaraiOS"
        width={160}
        height={48}
        priority={priority}
        className={cn(sizeClasses[size], "object-contain object-left", imageClassName)}
      />
    </span>
  );
}
