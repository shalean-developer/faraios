import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — business directory lives under Businesses. */
export default function AdminCompaniesRedirectPage() {
  redirect("/admin/businesses");
}
