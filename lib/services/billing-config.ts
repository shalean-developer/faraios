import {

  buildAdminBillingServiceCatalog,

  normalizeAdminBillingSettings,

} from "@/lib/billing/service-catalog";

import { getWorkspaceSetupFeeEnabled } from "@/lib/billing/platform-billing-settings";

import { getPlatformRevenueData } from "@/lib/services/admin";

import type { AdminBillingSettings } from "@/types/admin";



function getAppBaseUrl(): string | null {

  const appUrl =

    process.env.NEXT_PUBLIC_APP_URL?.trim() ||

    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||

    null;

  return appUrl ? appUrl.replace(/\/$/, "") : null;

}



export { buildAdminBillingServiceCatalog } from "@/lib/billing/service-catalog";



export async function getAdminBillingSettings(): Promise<AdminBillingSettings> {

  const appUrl = getAppBaseUrl();

  const paystackConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());

  const [revenue, workspaceSetupFeeEnabled] = await Promise.all([

    getPlatformRevenueData(),

    getWorkspaceSetupFeeEnabled(),

  ]);



  return normalizeAdminBillingSettings({

    paystackConfigured,

    paystackSource: paystackConfigured ? "env" : "none",

    appUrl,

    webhookUrl: appUrl ? `${appUrl}/api/paystack/webhook` : null,

    hostingWebhookUrl: appUrl ? `${appUrl}/api/hosting/payments/webhook` : null,

    workspaceSetupFeeEnabled,

    serviceCategories: buildAdminBillingServiceCatalog(workspaceSetupFeeEnabled),

    revenue: {

      mrr: revenue.mrr,

      activeSubscriptions: revenue.activeSubscriptions,

      successfulPayments: revenue.successfulPayments,

    },

  });

}

