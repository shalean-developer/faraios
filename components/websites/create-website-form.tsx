"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createWebsiteDraftAction } from "@/app/actions/websites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  businessName: string;
  industry: string;
  services: string;
  contactInfo: string;
  template: string;
  customDomain: string;
};

const INITIAL_STATE: FormState = {
  businessName: "",
  industry: "",
  services: "",
  contactInfo: "",
  template: "service-business",
  customDomain: "",
};

export function CreateWebsiteForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createWebsiteDraftAction({
        businessName: state.businessName,
        industry: state.industry,
        services: state.services,
        contactInfo: state.contactInfo,
        template: state.template,
        customDomain: state.customDomain,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Website draft created. You can now connect a domain and publish.");
      setState(INITIAL_STATE);
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
      <Input
        placeholder="Business name"
        value={state.businessName}
        onChange={(e) => setState((prev) => ({ ...prev, businessName: e.target.value }))}
        required
      />
      <Input
        placeholder="Industry"
        value={state.industry}
        onChange={(e) => setState((prev) => ({ ...prev, industry: e.target.value }))}
        required
      />
      <Textarea
        placeholder="Services (comma-separated)"
        value={state.services}
        onChange={(e) => setState((prev) => ({ ...prev, services: e.target.value }))}
        required
      />
      <Textarea
        placeholder="Contact info (phone, email, address)"
        value={state.contactInfo}
        onChange={(e) => setState((prev) => ({ ...prev, contactInfo: e.target.value }))}
        required
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Template</label>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={state.template}
          onChange={(e) => setState((prev) => ({ ...prev, template: e.target.value }))}
        >
          <option value="service-business">Service Business</option>
        </select>
      </div>
      <Input
        placeholder="Custom domain (optional) e.g. www.clientbusiness.com"
        value={state.customDomain}
        onChange={(e) => setState((prev) => ({ ...prev, customDomain: e.target.value }))}
      />

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Website Draft"}
      </Button>
    </form>
  );
}
