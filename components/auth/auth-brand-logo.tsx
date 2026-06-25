"use client";

import { useState } from "react";
import Link from "next/link";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { cn } from "@/lib/utils";

type AuthBrandLogoProps = {
  onDark?: boolean;
  className?: string;
};

function LogoFallback() {
  return (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white"
        aria-hidden
      >
        F
      </span>
      <span className="text-base font-bold tracking-tight text-slate-900">FaraiOS</span>
    </>
  );
}

export function AuthBrandLogo({ onDark = false, className }: AuthBrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href="/"
      aria-label="FaraiOS home"
      className={cn(
        "inline-flex items-center gap-2.5 transition-opacity hover:opacity-90",
        onDark && "rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/25",
        className
      )}
    >
      {imgError ? (
        <LogoFallback />
      ) : (
        <FaraiLogo
          priority
          size={onDark ? "header" : "md"}
          onError={() => setImgError(true)}
        />
      )}
    </Link>
  );
}
