import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — company list lives under Clients. */
export default function AdminCompaniesRedirectPage() {
  redirect("/admin/clients");
}
