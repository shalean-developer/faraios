import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Website — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DashboardCreateWebsitePage() {
  redirect("/admin/websites/create");
}
