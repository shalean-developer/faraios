import { FaraiAdminBusinessDetails } from "@/components/admin/farai-admin-business-details";
import {
  getAdminBusinessDetail,
  getAdminProjectDetails,
  getAdminSessionProfile,
} from "@/lib/services/admin";

export const metadata = {
  title: "Business Details — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminBusinessDetailPage(props: Props) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  const [business, project, profile] = await Promise.all([
    getAdminBusinessDetail(id),
    getAdminProjectDetails(id),
    getAdminSessionProfile(),
  ]);

  if (!business || !project) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Business not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The requested business does not exist or cannot be accessed.
          </p>
        </div>
      </div>
    );
  }

  const initialTab =
    tab === "pipeline" || tab === "users" || tab === "revenue" ? tab : "overview";

  return (
    <FaraiAdminBusinessDetails
      business={business}
      project={project}
      adminDisplayName={profile.adminDisplayName}
      initialTab={initialTab}
    />
  );
}
