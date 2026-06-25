import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { CLEANING_BOOKING_FORM_FIELDS } from "./demo-cleaning-booking-fields.mjs";

config({ path: ".env.local" });

const PRODUCTION_URL = "https://www.faraios.com";
const BOOK_URL = `${PRODUCTION_URL}/book-your-cleaning`;
const CLEANING_INDUSTRY_ID = "3314c5ad-7e62-4266-9a95-08b9160ef9e2";
const ADMIN_USER_ID = "1ddcb13b-4bbd-4547-910b-de71e116ac84";
const BOOK_NOW_PAGE_ID = 2716;
const WP_USER = process.env.FARAIOS_WP_USER ?? "faraios";
const WP_APP_PASSWORD = (process.env.FARAIOS_WP_APP_PASSWORD ?? "").replace(/\s+/g, "");

const APP_ORIGIN = resolveAppOrigin();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BROKEN_BOOKING_URL_PATTERNS = [
  /shalean\.co\.za\/booking/i,
  /shalean\.co\.za\/cleaning/i,
  /book-now-a-service/i,
  /\/book-now\/?(?:\?|#|$)/i,
];

function resolveAppOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://faraios.vercel.app";
  const normalized = raw.replace(/\/$/, "");
  if (/localhost|127\.0\.0\.1/.test(normalized)) return "https://faraios.vercel.app";
  return normalized;
}

function assertWordPressCredentials() {
  if (!WP_APP_PASSWORD) {
    throw new Error(
      "Missing FARAIOS_WP_APP_PASSWORD. Add it to .env.local to update faraios.com."
    );
  }
}

function wpAuthHeader() {
  const token = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

async function wpFetch(path, options = {}) {
  const res = await fetch(`https://www.faraios.com/wp-json${path}`, {
    ...options,
    headers: { ...wpAuthHeader(), ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`WordPress ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

function isBrokenBookingUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  return BROKEN_BOOKING_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function walkAndFixBookingLinks(node) {
  if (!node || typeof node !== "object") return 0;

  let fixes = 0;
  if (Array.isArray(node)) {
    for (const item of node) fixes += walkAndFixBookingLinks(item);
    return fixes;
  }

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string" && isBrokenBookingUrl(value)) {
      node[key] = BOOK_URL;
      fixes += 1;
    } else if (value && typeof value === "object") {
      fixes += walkAndFixBookingLinks(value);
    }
  }
  return fixes;
}

function bookingEmbedHtml(businessId) {
  const src = `${APP_ORIGIN}/book/${businessId}?embed=1`;
  return `<iframe src="${src}" title="Book an appointment" style="width:100%;min-height:720px;border:0;border-radius:12px;" loading="lazy"></iframe>`;
}

function trackingSnippet(businessId) {
  return `<script src="${APP_ORIGIN}/tracking.js" data-business-id="${businessId}"></script>`;
}

async function ensureCompany() {
  const slug = "shalean-cleaning-services";
  const { data: existing } = await supabase
    .from("companies")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing;

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      name: "FaraiOS Cleaning Services",
      slug,
      industry_id: CLEANING_INDUSTRY_ID,
      plan: "growth",
      subscription_status: "active",
      primary_contact_email: "info@faraios.com",
      contact_phone: "+27825915525",
      industry_template_applied: true,
      industry_template_key: "cleaning",
      template_applied_at: new Date().toISOString(),
    })
    .select("id, slug, name")
    .single();

  if (error) throw new Error(`Company insert failed: ${error.message}`);
  return company;
}

async function ensureMembership(companyId) {
  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", ADMIN_USER_ID)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from("memberships").insert({
    company_id: companyId,
    user_id: ADMIN_USER_ID,
    role: "owner",
  });
  if (error) throw new Error(`Membership insert failed: ${error.message}`);
}

async function seedServices(companyId) {
  const templates = [
    {
      name: "Standard Cleaning",
      category: "Residential",
      description: "Regular home cleaning service.",
      base_price_cents: 45000,
      duration_minutes: 180,
    },
    {
      name: "Deep Cleaning",
      category: "Residential",
      description: "Detailed deep clean for kitchens, bathrooms, and living areas.",
      base_price_cents: 65000,
      duration_minutes: 240,
    },
    {
      name: "Move In / Move Out Cleaning",
      category: "Residential",
      description: "End of tenancy and move-in cleaning.",
      base_price_cents: 85000,
      duration_minutes: 300,
    },
    {
      name: "Commercial Cleaning",
      category: "Commercial",
      description: "Office and commercial property cleaning.",
      base_price_cents: 75000,
      duration_minutes: 240,
    },
    {
      name: "Carpet Cleaning",
      category: "Specialty",
      description: "Professional carpet cleaning.",
      base_price_cents: 55000,
      duration_minutes: 120,
    },
  ];

  for (const [index, template] of templates.entries()) {
    const { data: existing } = await supabase
      .from("company_services")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", template.name)
      .maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from("company_services").insert({
      company_id: companyId,
      ...template,
      active: true,
      industry_key: "cleaning",
      is_template_service: true,
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn(`Service seed warning (${template.name}):`, error.message);
  }
}

async function ensureBookingForm(companyId) {
  const { error } = await supabase.from("booking_forms").upsert(
    {
      company_id: companyId,
      industry_slug: "cleaning",
      name: "Booking form",
      status: "published",
      fields: CLEANING_BOOKING_FORM_FIELDS,
      version: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );
  if (error) throw new Error(`Booking form upsert failed: ${error.message}`);
}

async function ensureConnectedWebsite(companyId, slug) {
  const { error } = await supabase.from("connected_websites").upsert(
    {
      company_id: companyId,
      type: "external",
      name: "FaraiOS Cleaning Services Website",
      production_url: PRODUCTION_URL,
      primary_domain: "faraios.com",
      preview_subdomain: `${slug}.faraios.com`,
      status: "connected",
      booking_enabled: true,
      tracking_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );
  if (error) throw new Error(`Connected website upsert failed: ${error.message}`);
}

async function fixElementorDocument(postType, postId, label) {
  const post = await wpFetch(`/wp/v2/${postType}/${postId}?context=edit`);
  const raw = post.meta?._elementor_data;
  if (!raw) return 0;

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const fixes = walkAndFixBookingLinks(data);
  if (fixes === 0) return 0;

  await wpFetch(`/wp/v2/${postType}/${postId}`, {
    method: "PUT",
    body: JSON.stringify({
      meta: {
        _elementor_data: JSON.stringify(data),
      },
    }),
  });

  console.log(`  Fixed ${fixes} booking link(s) in ${label} (${postType} #${postId})`);
  return fixes;
}

async function fixSiteWideBookingButtons() {
  let total = 0;

  let libraryPage = 1;
  while (true) {
    const templates = await wpFetch(
      `/wp/v2/elementor_library?per_page=50&page=${libraryPage}&context=edit`
    );
    if (!templates.length) break;

    for (const item of templates) {
      if (!item.meta?._elementor_data) continue;
      total += await fixElementorDocument(
        "elementor_library",
        item.id,
        `template "${item.slug}"`
      );
    }

    if (templates.length < 50) break;
    libraryPage += 1;
  }

  let page = 1;
  while (true) {
    const pages = await wpFetch(`/wp/v2/pages?per_page=50&page=${page}&context=edit`);
    if (!pages.length) break;

    for (const item of pages) {
      if (!item.meta?._elementor_data) continue;
      total += await fixElementorDocument("pages", item.id, `page "${item.slug}"`);
    }

    if (pages.length < 50) break;
    page += 1;
  }

  return total;
}

async function clearElementorCache() {
  try {
    await wpFetch("/elementor/v1/cache", { method: "DELETE" });
    console.log("Cleared Elementor cache.");
  } catch (error) {
    console.warn("Elementor cache clear:", error.message);
  }
}

async function installTrackingSnippet(businessId) {
  const snippets = await wpFetch("/wp/v2/elementor_snippet?per_page=50&context=edit");
  const existing = snippets.find((s) => s.slug === "faraios-tracking");
  const payload = {
    title: "FaraiOS Tracking",
    status: "publish",
    slug: "faraios-tracking",
    meta: {
      _elementor_location: "elementor_body_end",
      _elementor_priority: 10,
      _elementor_code: trackingSnippet(businessId),
    },
  };

  if (existing) {
    return wpFetch(`/wp/v2/elementor_snippet/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  return wpFetch("/wp/v2/elementor_snippet", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function installBookingWidget(businessId) {
  const page = await wpFetch(`/wp/v2/pages/${BOOK_NOW_PAGE_ID}?context=edit`);
  const elementorData = JSON.parse(page.meta._elementor_data);

  const formContainer = elementorData[0]?.elements?.[0];
  if (!formContainer) throw new Error("Unexpected Elementor layout on Book Now page.");

  const heading = formContainer.elements?.find((w) => w.widgetType === "heading");
  if (heading) {
    heading.settings.title = "Book Your Cleaning Service";
  }

  const formWidgetIndex = formContainer.elements?.findIndex(
    (w) => w.widgetType === "fluent-form-widget" || w.widgetType === "html" || w.id === "d00a011"
  );
  if (formWidgetIndex === -1) {
    throw new Error("Could not find form widget on Book Now page.");
  }

  formContainer.elements[formWidgetIndex] = {
    id: "d00a011",
    elType: "widget",
    settings: {
      html: bookingEmbedHtml(businessId),
      ekit_all_conditions_list: [],
      ekit_adv_tooltip_content: "Tooltip Content.",
    },
    elements: [],
    widgetType: "html",
  };

  return wpFetch(`/wp/v2/pages/${BOOK_NOW_PAGE_ID}`, {
    method: "PUT",
    body: JSON.stringify({
      meta: {
        _elementor_data: JSON.stringify(elementorData),
      },
    }),
  });
}

async function removeRankMathRedirect(pageId) {
  try {
    await wpFetch("/rankmath/v1/updateRedirection", {
      method: "POST",
      body: JSON.stringify({
        objectID: pageId,
        objectType: "post",
        hasRedirect: false,
      }),
    });
  } catch (error) {
    console.warn("RankMath redirect removal:", error.message);
  }
}

async function ensureBookPageSlug(pageId) {
  const page = await wpFetch(`/wp/v2/pages/${pageId}?context=edit`);
  if (page.slug === "book-now-a-service") {
    return wpFetch(`/wp/v2/pages/${pageId}`, {
      method: "PUT",
      body: JSON.stringify({ slug: "book-your-cleaning" }),
    });
  }
  return page;
}

async function main() {
  console.log("Creating FaraiOS Cleaning Services workspace...");
  const company = await ensureCompany();
  console.log("Company:", company.id, company.slug);

  await ensureMembership(company.id);
  await seedServices(company.id);
  await ensureBookingForm(company.id);
  await ensureConnectedWebsite(company.id, company.slug);
  console.log("Published cleaning booking form with", CLEANING_BOOKING_FORM_FIELDS.length, "fields.");

  const runWordPress = process.argv.includes("--wordpress") || Boolean(WP_APP_PASSWORD);
  if (!runWordPress) {
    console.log("\nSupabase setup complete. Re-run with FARAIOS_WP_APP_PASSWORD set to update faraios.com.");
    console.log("Dashboard:", `${APP_ORIGIN}/${company.slug}/dashboard/booking-form`);
    console.log("Book page:", BOOK_URL);
    console.log("Business ID:", company.id);
    return;
  }

  assertWordPressCredentials();

  console.log("Fixing broken booking buttons site-wide (header, footer, pages, 404)...");
  const linkFixes = await fixSiteWideBookingButtons();
  console.log(`Updated ${linkFixes} broken booking link(s) to ${BOOK_URL}`);

  console.log("Installing FaraiOS tracking snippet on WordPress...");
  await installTrackingSnippet(company.id);

  console.log("Removing legacy Rank Math redirect on Book page...");
  await removeRankMathRedirect(BOOK_NOW_PAGE_ID);
  const bookPage = await ensureBookPageSlug(BOOK_NOW_PAGE_ID);

  console.log("Installing FaraiOS booking widget on Book Now page...");
  await installBookingWidget(company.id);

  console.log("Clearing Elementor cache so booking button updates appear immediately...");
  await clearElementorCache();

  console.log("\nDone.");
  console.log("Dashboard:", `${APP_ORIGIN}/${company.slug}/dashboard/websites/connection`);
  console.log("Book page:", bookPage.link ?? BOOK_URL);
  console.log("Business ID:", company.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
