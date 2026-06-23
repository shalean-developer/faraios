import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ submitted?: string }>;
};

export default async function LegacyCompanyProjectRedirect({
  params,
  searchParams,
}: Props) {
  const { company } = await params;
  const { submitted } = await searchParams;
  const slug = decodeURIComponent(company);
  const query = submitted === "1" ? "?submitted=1" : "";
  redirect(`/${encodeURIComponent(slug)}/dashboard/project${query}`);
}
