import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — dashboard lives at `/admin`. */
export default function AdminDashboardRedirectPage() {
  redirect("/admin");
}
