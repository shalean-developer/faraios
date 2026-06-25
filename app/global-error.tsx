"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Application error</h1>
            <p className="mt-2 text-sm text-slate-600">
              Shalean encountered a critical error. Please refresh the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
