import { Navbar } from "@/components/Navbar";
import { listBookingsForCompany } from "@/lib/services/bookings";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listProjectsForCompany } from "@/lib/services/projects";
import { getWebsiteForCompany } from "@/lib/services/websites";

import { CompanyDashboardClient } from "./company-dashboard-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  const projects = row ? await listProjectsForCompany(row.id) : [];
  const bookings = row ? await listBookingsForCompany(row.id) : [];
  const website = row ? await getWebsiteForCompany(row.id) : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      <main>
        <CompanyDashboardClient
          slug={slug}
          company={row}
          projects={projects}
          bookings={bookings}
          website={website}
        />
      </main>
    </div>
  );
}
