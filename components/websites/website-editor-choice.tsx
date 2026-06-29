"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, FileText, Hammer, Loader2 } from "lucide-react";

import { initializeWebsiteBuilderAction } from "@/app/actions/website-builder";
import {
  companyWebsiteBuilderPath,
  companyWebsiteEditPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { WebsiteEditorChoice } from "@/lib/websites/editor-choice";
import { primaryHostedWebsiteForClassicEditor } from "@/lib/websites/editor-choice";

const cardClassName =
  "group flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md";

export function WebsiteEditorChoicePanel({
  slug,
  companyId,
  editorChoice,
  className,
}: {
  slug: string;
  companyId: string;
  editorChoice: WebsiteEditorChoice;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const { legacy, builder } = editorChoice;
  const classicSite = primaryHostedWebsiteForClassicEditor(editorChoice);

  if (!legacy && !builder && !classicSite) {
    return null;
  }

  const handleUpgradeToBuilder = () => {
    startTransition(async () => {
      const result = await initializeWebsiteBuilderAction({ companyId, companySlug: slug });
      if (result.ok) {
        router.push(companyWebsiteBuilderPath(slug));
        router.refresh();
      }
    });
  };

  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-medium text-slate-700">Choose how you edit your site</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Use the visual website builder or the classic section-based content editor — you can switch
          at any time.
        </p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <div
          className={cn(
            cardClassName,
            builder ? "border-[#5a8dee]/40 ring-1 ring-[#5a8dee]/10" : "border-slate-200"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4a6fd8]">
              <Hammer className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">Visual website builder</p>
              <p className="mt-0.5 text-sm leading-snug text-slate-500">
                Drag-and-drop pages, theme, SEO, publishing, and domains.
              </p>
            </div>
          </div>
          <div className="mt-4">
            {builder ? (
              <Link
                href={companyWebsiteBuilderPath(slug)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4a6fd8] hover:underline"
              >
                Open website builder
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={handleUpgradeToBuilder}
                className="inline-flex items-center gap-2 rounded-md bg-[#5a8dee] px-3 py-2 text-sm font-medium text-white hover:bg-[#4a7de0] disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Switch to visual builder
              </button>
            )}
          </div>
          {legacy && !builder ? (
            <p className="mt-3 text-xs text-slate-500">
              Upgrading keeps your hosted site and domain. Your classic content stays available in the
              section editor.
            </p>
          ) : null}
        </div>

        {classicSite ? (
          <div className={cn(cardClassName, legacy ? "border-slate-200" : "border-slate-200")}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">Classic content editor</p>
                <p className="mt-0.5 text-sm leading-snug text-slate-500">
                  Edit hero, services, gallery, and template sections for your hosted site.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href={companyWebsiteEditPath(slug, classicSite.id)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4a6fd8] hover:underline"
              >
                Open classic editor
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {builder && legacy ? null : builder && !legacy ? (
              <p className="mt-3 text-xs text-slate-500">
                Template sections from your original hosted site.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
