"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CompanyHostingNav } from "@/components/hosting/company-hosting-nav";
import { companyDashboardPath } from "@/lib/paths/company";

export function CompanyHostingShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f6fb]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href={companyDashboardPath(slug)}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <CompanyHostingNav slug={slug} />
        {children}
      </div>
    </div>
  );
}
