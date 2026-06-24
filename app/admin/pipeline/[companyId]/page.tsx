import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy pipeline detail URL — business detail lives under Businesses. */
export default async function AdminPipelineProjectRedirectPage(props: Props) {
  const { companyId } = await props.params;
  const searchParams = await props.searchParams;
  const tab = typeof searchParams.tab === "string" ? searchParams.tab : "pipeline";
  redirect(`/admin/businesses/${companyId}?tab=${tab === "pipeline" ? "pipeline" : tab}`);
}
