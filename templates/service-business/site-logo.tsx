import Image from "next/image";
import type { ReactNode } from "react";

import { resolveLogoDisplay } from "@/lib/website-templates/logo-display";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { cn } from "@/lib/utils";

type SiteLogoMarkProps = {
  logo?: string | null;
  alt: string;
  size?: unknown;
  width?: unknown;
  shape?: unknown;
  fallback?: ReactNode;
  className?: string;
  roundedClassName?: string;
  useLuxuryImage?: boolean;
};

export function SiteLogoMark({
  logo,
  alt,
  size,
  width,
  shape,
  fallback,
  className,
  roundedClassName,
  useLuxuryImage = false,
}: SiteLogoMarkProps) {
  const display = resolveLogoDisplay(shape, size, width);
  const rounding = roundedClassName ?? display.roundedClassName;

  if (logo?.trim()) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden bg-white/95",
          rounding,
          className
        )}
        style={{ width: display.widthPx, height: display.heightPx }}
      >
        {useLuxuryImage ? (
          <LuxuryImage
            src={logo}
            alt={alt}
            fill
            fallbackIndex={0}
            className="object-contain p-0.5"
          />
        ) : (
          <Image
            src={logo}
            alt={alt}
            fill
            className="object-contain p-0.5"
            unoptimized
          />
        )}
      </span>
    );
  }

  if (fallback) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden", rounding, className)}
        style={{ width: display.widthPx, height: display.heightPx }}
      >
        {fallback}
      </span>
    );
  }

  return null;
}
