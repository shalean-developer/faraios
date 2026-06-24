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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white"
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
          imageClassName={cn(
            "object-contain object-left",
            onDark ? "h-12 w-auto max-w-[172px]" : "h-10 w-auto max-w-[148px]"
          )}
          onError={() => setImgError(true)}
        />
      )}
    </Link>
  );
}
