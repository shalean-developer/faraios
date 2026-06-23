"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Something went wrong
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">We hit an unexpected error</h1>
        <p className="mt-2 text-sm text-slate-600">
          Try again. If the problem continues, refresh the page or return home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" className="rounded-xl" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/">
            <Button type="button" variant="outline" className="rounded-xl">
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
