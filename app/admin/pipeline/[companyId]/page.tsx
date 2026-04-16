import Link from "next/link";

import { FaraiAdminProjectDetails } from "@/components/admin/farai-admin-project-details";
import {
  getAdminProjectDetails,
  isCurrentUserPlatformAdmin,
} from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Pipeline Project — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#f8f7ff" }}>
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Admin access required</h1>
        <p className="mt-2 text-sm text-gray-500">
          This area is restricted to platform administrators. Ask an owner to add
          your account to <code className="rounded bg-gray-100 px-1">platform_admins</code>{" "}
          in Supabase, then sign in again.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

type Props = {
  params: Promise<{ companyId: string }>;
};

export default async function AdminPipelineProjectPage(props: Props) {
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return <AccessDenied />;
  }

  const { companyId } = await props.params;
  const project = await getAdminProjectDetails(companyId);
  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Project not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The requested project does not exist or cannot be accessed.
          </p>
          <Link href="/admin" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            ← Back to pipeline
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Super Admin");

  return (
    <FaraiAdminProjectDetails
      project={project}
      adminEmail={user?.email ?? null}
      adminDisplayName={adminDisplayName}
    />
  );
}
