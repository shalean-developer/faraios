import Link from "next/link";

import { ProjectStatusTracker } from "@/components/project/project-status-tracker";
import { getProjectByCompany } from "@/lib/services/projects";
import { companyWebsitesPath } from "@/lib/paths/company";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ submitted?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  return {
    title: `Website build — ${slug} — Shalean`,
    description: "Track your Shalean website build progress.",
  };
}

function AccessWall({ slug }: { slug: string }) {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sign in required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Website build tracking is available to workspace members.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-sm font-semibold">
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(`/${slug}/dashboard/project`)}`}
            className="text-indigo-600 hover:underline"
          >
            Sign in
          </Link>
          <Link href={companyWebsitesPath(slug)} className="text-slate-600 hover:underline">
            Back to websites
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function CompanyProjectPage({ params, searchParams }: Props) {
  const { company } = await params;
  const { submitted } = await searchParams;
  const slug = decodeURIComponent(company);

  const data = await getProjectByCompany(slug);
  if (!data) {
    return <AccessWall slug={slug} />;
  }

  return (
    <ProjectStatusTracker data={data} showSubmittedBanner={submitted === "1"} />
  );
}
