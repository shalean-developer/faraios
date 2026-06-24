import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export function AdminModulePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
            <Construction className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Coming in the next phase</h2>
          <p className="mt-2 text-sm text-gray-500">
            This module is part of the platform admin restructure. The navigation and routing
            are in place; detailed monitoring and management tools will ship next.
          </p>
          {phase ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {phase}
            </p>
          ) : null}
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
        </div>
      </main>
    </>
  );
}
