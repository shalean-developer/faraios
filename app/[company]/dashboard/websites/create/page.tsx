import Link from "next/link";

import { CreateWebsiteForm } from "@/components/websites/create-website-form";
import { companyDashboardPath, companyWebsitesPath } from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Create Website — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyCreateWebsitePage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm text-slate-500">Please sign in to create a website.</p>
        <Link href="/auth/sign-in" className="mt-4 inline-block text-sm font-medium text-violet-700">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-4 text-sm font-medium">
        <Link href={companyDashboardPath(slug)} className="text-violet-700 hover:text-violet-900">
          ← Dashboard
        </Link>
        <Link href={companyWebsitesPath(slug)} className="text-slate-600 hover:text-slate-900">
          Websites
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Create website
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Start a new draft website. You can connect a domain and publish later.
      </p>
      <div className="mt-6">
        <CreateWebsiteForm companySlug={slug} />
      </div>
    </main>
  );
}
