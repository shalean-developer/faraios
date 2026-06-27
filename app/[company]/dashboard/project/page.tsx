import Link from "next/link";

import { ProjectStatusTracker } from "@/components/project/project-status-tracker";
import { getProjectByCompany } from "@/lib/services/projects";
import { companyWebsitesPath } from "@/lib/paths/company";
import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ submitted?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  return {
    title: `Website build — ${slug} — FaraiOS`,
    description: "Track your FaraiOS website build progress.",
  };
}

function AccessWall({ slug }: { slug: string }) {
  return (
    <div className={risePageClassName}>
      <div className={cn(riseCardClassName, "mx-auto max-w-md p-8 text-center")}>
        <h1 className="text-lg font-medium text-slate-800">Sign in required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Website build tracking is available to workspace members.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-sm font-medium">
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(`/${slug}/dashboard/project`)}`}
            className="text-[#5a8dee] hover:text-[#4a6fd8]"
          >
            Sign in
          </Link>
          <Link
            href={companyWebsitesPath(slug)}
            className="text-slate-600 hover:text-slate-900"
          >
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
