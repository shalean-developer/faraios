"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createWebsiteDraftAsAdminAction } from "@/app/actions/websites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  companyId: string;
  businessName: string;
  industry: string;
  services: string;
  phone: string;
  email: string;
  template: string;
  domain: string;
};

const INITIAL_STATE: FormState = {
  companyId: "",
  businessName: "",
  industry: "cleaning",
  services: "",
  phone: "",
  email: "",
  template: "service-business",
  domain: "",
};

type CompanyOption = { id: string; name: string };

type Props = {
  companies: CompanyOption[];
};

export function AdminCreateWebsiteForm({ companies }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(INITIAL_STATE);
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
        template: state.template,
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
          onChange={(e) => setState((prev) => ({ ...prev, companyId: e.target.value }))}
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
          <option value="cleaning">Cleaning</option>
          <option value="plumbing">Plumbing</option>
          <option value="gym">Gym</option>
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

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Template</label>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={state.template}
          onChange={(e) => setState((prev) => ({ ...prev, template: e.target.value }))}
        >
          <option value="service-business">Service</option>
        </select>
      </div>

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
