import { notFound } from "next/navigation";

import { FaraiAdminSupportDetail } from "@/components/admin/farai-admin-support-detail";
import { getAdminSupportTicketDetail } from "@/lib/services/admin";

export const metadata = {
  title: "Support Ticket — FaraiOS Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getAdminSupportTicketDetail(id);
  if (!ticket) notFound();
  return <FaraiAdminSupportDetail ticket={ticket} />;
}
