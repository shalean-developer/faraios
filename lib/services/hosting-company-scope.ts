import { notFound } from "next/navigation";

import { loadCompanyHostingPage } from "@/lib/services/hosting-company-pages";

export function resolveScopedHostingService(
  services: { id: string; domain_name: string }[],
  serviceId?: string
): { scopedServiceId?: string; scopedServiceDomain?: string } {
  if (!serviceId) {
    return {};
  }

  const service = services.find((entry) => entry.id === serviceId);
  if (!service) notFound();

  return {
    scopedServiceId: service.id,
    scopedServiceDomain: service.domain_name,
  };
}

export async function loadScopedCompanyHostingPage(companyParam: string, serviceId?: string) {
  const context = await loadCompanyHostingPage(companyParam);
  const scope = resolveScopedHostingService(context.overview.services, serviceId);
  return { ...context, ...scope };
}
