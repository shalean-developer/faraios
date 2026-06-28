"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createWebsiteDraftAsAdminAction } from "@/app/actions/websites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listIndustryModuleSlugs, loadIndustryModule } from "@/lib/industry-modules/loader";

type FormState = {
  companyId: string;
  businessName: string;
  industry: string;
  services: string;
  phone: string;
  email: string;
  domain: string;
};

const INDUSTRY_OPTIONS = listIndustryModuleSlugs().map((slug) => ({
  slug,
  name: loadIndustryModule(slug).name,
}));

const INITIAL_STATE: FormState = {
  companyId: "",
  businessName: "",
  industry: INDUSTRY_OPTIONS[0]?.slug ?? "cleaning",
  services: "",
  phone: "",
  email: "",
  domain: "",
};

type CompanyOption = { id: string; name: string };

type Props = {
  companies: CompanyOption[];
  initialCompanyId?: string;
};

export function AdminCreateWebsiteForm({ companies, initialCompanyId = "" }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => {
    const selectedCompany = companies.find((company) => company.id === initialCompanyId);
    return {
      ...INITIAL_STATE,
      companyId: initialCompanyId,
      businessName: selectedCompany?.name ?? "",
    };
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const contactInfo = [
        state.phone ? `Phone: ${state.phone}` : "",
        state.email ? `Email: ${state.email}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await createWebsiteDraftAsAdminAction(state.companyId, {
        businessName: state.businessName,
        industry: state.industry,
        services: state.services,
        contactInfo,
        customDomain: state.domain,
      });

      if (!result.ok || !result.websiteId) {
        setError(result.ok ? "Website was created but no ID was returned." : result.error);
        return;
      }

      router.push(`/admin/websites/${result.websiteId}/edit`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Client</label>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={state.companyId}
          onChange={(e) => {
            const companyId = e.target.value;
            const selectedCompany = companies.find((company) => company.id === companyId);
            setState((prev) => ({
              ...prev,
              companyId,
              businessName: selectedCompany?.name ?? prev.businessName,
            }));
          }}
          required
        >
          <option value="">Select client</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <Input
        placeholder="Business Name"
        value={state.businessName}
        onChange={(e) =>
          setState((prev) => ({ ...prev, businessName: e.target.value }))
        }
        required
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Industry</label>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={state.industry}
          onChange={(e) => setState((prev) => ({ ...prev, industry: e.target.value }))}
        >
          {INDUSTRY_OPTIONS.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <Textarea
        placeholder="Services (comma-separated)"
        value={state.services}
        onChange={(e) => setState((prev) => ({ ...prev, services: e.target.value }))}
      />

      <Input
        placeholder="Phone"
        value={state.phone}
        onChange={(e) => setState((prev) => ({ ...prev, phone: e.target.value }))}
        required
      />

      <Input
        placeholder="Email"
        type="email"
        value={state.email}
        onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
        required
      />

      <Input
        placeholder="Domain (optional) e.g. www.clientbusiness.com"
        value={state.domain}
        onChange={(e) => setState((prev) => ({ ...prev, domain: e.target.value }))}
      />

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Website"}
      </Button>
    </form>
  );
}
