"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { publishWebsiteWithLifecycleAction } from "@/app/actions/website-publish-lifecycle";
import { publicSitePath } from "@/lib/paths/company";

export function PublishLifecycleSection({
  slug,
  companyId,
  website,
}: {
  slug: string;
  companyId: string;
  website: { status: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const setStatus = (status: "draft" | "published" | "unpublished") => {
    setMessage(null);
    startTransition(async () => {
      const result = await publishWebsiteWithLifecycleAction({
        companyId,
        companySlug: slug,
        status,
      });
      setMessage(
        result.ok
          ? status === "published"
            ? "Publishing checks passed. Website is live."
            : `Status set to ${status}.`
          : result.error
      );
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <h1 className="text-lg font-medium text-slate-800">Publishing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Publish verifies the FaraiOS origin, custom domain, SSL and live HTTP response before a site is marked live.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Publish status</h2>
          <p className="mt-1 text-sm text-slate-500">
            Failed checks keep the previous public state and return an actionable reason. Retry Publish after fixing the reported dependency.
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600">
            Current status: <span className="font-semibold capitalize">{website.status}</span>
          </p>

          <ol className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-5">
            {[
              "Origin",
              "Domain",
              "SSL",
              "Preview smoke",
              "Live smoke",
            ].map((stage, index) => (
              <li key={stage} className="rounded-lg border border-slate-200 px-3 py-2">
                <span className="font-semibold text-slate-800">{index + 1}.</span> {stage}
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["draft", "published", "unpublished"] as const).map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending || website.status === status}
                onClick={() => setStatus(status)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium capitalize disabled:opacity-60 ${
                  website.status === status
                    ? "bg-violet-600 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {pending && status === "published" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {status}
              </button>
            ))}
          </div>

          <Link
            href={publicSitePath(slug)}
            target="_blank"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700"
          >
            <Eye className="h-4 w-4" />
            View public URL
          </Link>

          {message ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                message.startsWith("Publish blocked") || message.startsWith("Publish lifecycle")
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
