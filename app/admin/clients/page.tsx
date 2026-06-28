import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy URL — business directory lives under Businesses. */
export default async function AdminClientsRedirectPage(props: Props) {
  const searchParams = await props.searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    }
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/admin/businesses${suffix}`);
}
