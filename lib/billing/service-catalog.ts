import { hostingPlans } from "@/lib/data/hosting";
import {
  formatServicePrice,
  formatZar,
  growthServices,
  hostingAddOns,
  isSelfServePlan,
  pricingPlans,
  websiteServices,
} from "@/lib/data/pricing";
import type {
  AdminBillingServiceCategory,
  AdminBillingServiceRow,
  AdminBillingSettings,
} from "@/types/admin";

function buildWorkspaceCategory(
  setupFeeEnabled: boolean
): AdminBillingServiceCategory {
  const rows: AdminBillingServiceRow[] = pricingPlans.map((plan) => {
    const selfServe = isSelfServePlan(plan.slug);
    return {
      id: plan.id,
      name: plan.name,
      priceLabel: selfServe
        ? `${formatZar(plan.monthly_price)}/month`
        : "Custom pricing",
      billingLabel: selfServe
        ? setupFeeEnabled
          ? `${formatZar(plan.setup_price)} setup · ${formatZar(plan.monthly_price + plan.setup_price)} first checkout`
          : `${formatZar(plan.monthly_price)}/month · setup fee off`
        : "Sales-assisted",
      checkout: selfServe ? "paystack" : "contact-sales",
    };
  });

  return {
    key: "workspace",
    title: "Workspace plans",
    description:
      "Business operating system — bookings, CRM, quotes, invoices, team, and growth tools.",
    rows,
  };
}

function buildWebsiteDesignCategory(): AdminBillingServiceCategory {
  return {
    key: "website-design",
    title: "Website design",
    description:
      "Done-for-you website builds. Priced once-off; fulfillment is managed by the FaraiOS team.",
    rows: websiteServices.map((service) => ({
      id: service.id,
      name: service.name,
      priceLabel: service.price_label ?? formatZar(service.price),
      billingLabel: "Once-off",
      checkout: "managed",
    })),
  };
}

function buildGrowthCategory(): AdminBillingServiceCategory {
  return {
    key: "growth",
    title: "SEO & growth services",
    description:
      "Managed SEO, content, and paid marketing — separate from in-workspace SEO tools on Pro plans.",
    rows: growthServices.map((service) => ({
      id: service.id,
      name: service.name,
      priceLabel: formatServicePrice(service.price, service.billing, service.price_label),
      billingLabel: service.billing === "once" ? "Once-off" : "Monthly retainer",
      checkout: "managed",
    })),
  };
}

function buildHostingInfrastructureCategory(): AdminBillingServiceCategory {
  return {
    key: "hosting-infrastructure",
    title: "Website hosting",
    description:
      "Self-serve hosting subscriptions billed through Paystack — separate from workspace SaaS.",
    rows: hostingPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceLabel: `${formatZar(plan.monthly_price)}/month`,
      billingLabel: `${plan.sites_limit} site${plan.sites_limit === 1 ? "" : "s"} · ${plan.storage_gb} GB storage`,
      checkout: "paystack" as const,
    })),
  };
}

function buildHostingAddOnCategory(): AdminBillingServiceCategory {
  return {
    key: "hosting-addons",
    title: "Hosting add-ons (marketing)",
    description:
      "Simplified hosting tiers shown on the public pricing page for customers who bundle hosting with onboarding.",
    rows: hostingAddOns.map((addon) => ({
      id: addon.id,
      name: addon.name,
      priceLabel: `${formatZar(addon.monthly_price)}/month`,
      billingLabel: "Optional add-on",
      checkout: "contact-sales",
    })),
  };
}

export function buildAdminBillingServiceCatalog(
  setupFeeEnabled = true
): AdminBillingServiceCategory[] {
  return [
    buildWorkspaceCategory(setupFeeEnabled),
    buildWebsiteDesignCategory(),
    buildGrowthCategory(),
    buildHostingInfrastructureCategory(),
    buildHostingAddOnCategory(),
  ];
}

export const EMPTY_ADMIN_BILLING_SETTINGS: AdminBillingSettings = {
  paystackConfigured: false,
  paystackSource: "none",
  appUrl: null,
  webhookUrl: null,
  hostingWebhookUrl: null,
  workspaceSetupFeeEnabled: true,
  serviceCategories: buildAdminBillingServiceCatalog(true),
  revenue: {
    mrr: 0,
    activeSubscriptions: 0,
    successfulPayments: 0,
  },
};

export function normalizeAdminBillingSettings(
  settings: Partial<AdminBillingSettings> | null | undefined
): AdminBillingSettings {
  const fallback = EMPTY_ADMIN_BILLING_SETTINGS;
  if (!settings) return fallback;

  return {
    paystackConfigured: settings.paystackConfigured ?? fallback.paystackConfigured,
    paystackSource: settings.paystackSource ?? fallback.paystackSource,
    appUrl: settings.appUrl ?? fallback.appUrl,
    webhookUrl: settings.webhookUrl ?? fallback.webhookUrl,
    hostingWebhookUrl: settings.hostingWebhookUrl ?? fallback.hostingWebhookUrl,
    workspaceSetupFeeEnabled:
      settings.workspaceSetupFeeEnabled ?? fallback.workspaceSetupFeeEnabled,
    serviceCategories:
      settings.serviceCategories?.length
        ? settings.serviceCategories
        : buildAdminBillingServiceCatalog(
            settings.workspaceSetupFeeEnabled ?? fallback.workspaceSetupFeeEnabled
          ),
    revenue: {
      mrr: settings.revenue?.mrr ?? fallback.revenue.mrr,
      activeSubscriptions:
        settings.revenue?.activeSubscriptions ?? fallback.revenue.activeSubscriptions,
      successfulPayments:
        settings.revenue?.successfulPayments ?? fallback.revenue.successfulPayments,
    },
  };
}
