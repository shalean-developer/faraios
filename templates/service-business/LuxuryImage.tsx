"use client";

import { useState } from "react";

import {
  luxuryFallbackImage,
  resolveLuxuryImageUrl,
} from "@/templates/service-business/luxury-fallback-images";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackIndex?: number;
  fill?: boolean;
  priority?: boolean;
};

export function LuxuryImage({
  src,
  alt,
  className = "",
  fallbackIndex = 0,
  fill = false,
  priority = false,
}: Props) {
  const initial = resolveLuxuryImageUrl(src, fallbackIndex);
  const [currentSrc, setCurrentSrc] = useState(initial);

  function handleError() {
    const fallback = luxuryFallbackImage(fallbackIndex);
    if (currentSrc !== fallback) setCurrentSrc(fallback);
  }

  const imgClass = fill
    ? `absolute inset-0 h-full w-full object-cover ${className}`.trim()
    : `block h-full w-full object-cover ${className}`.trim();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={imgClass}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={handleError}
    />
  );
}
