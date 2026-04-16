import Link from "next/link";

import { ProjectStatusTracker } from "@/components/project/project-status-tracker";
import { getProjectByCompany } from "@/lib/services/projects";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  return {
    title: `Project — ${slug} — FaraiOS`,
    description: "Track your website build from kickoff to go-live.",
  };
}

function AccessWall({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fc] px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sign in required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Project tracking is available to workspace members. Sign in and open this page again,
          or return to your company hub.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-sm font-semibold">
          <Link href="/auth/sign-in" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
          <Link href={`/${encodeURIComponent(slug)}/dashboard`} className="text-slate-600 hover:underline">
            Back to {slug} dashboard
          </Link>
          <Link href="/" className="text-slate-500 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function CompanyProjectPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const data = await getProjectByCompany(slug);
  if (!data) {
    return <AccessWall slug={slug} />;
  }

  return <ProjectStatusTracker data={data} />;
}
