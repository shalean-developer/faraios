import { slugifyBusinessName } from "@/lib/slug";
import { normalizePlanSlug } from "@/lib/data/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";

export type CreateBusinessSystemInput = {
  businessName: string;
  industryId: string;
  /** From pricing page query, e.g. starter | business | premium */
  plan: string | null | undefined;
  /** Optional client hint; must match the authenticated session user. */
  userId?: string | null;
};

export type CreateBusinessSystemSuccess = {
  company: {
    id: string;
    slug: string;
    name: string;
    plan: string;
  };
  project: {
    id: string;
    name: string;
  };
};

export type CreateBusinessSystemResult =
  | { ok: true; data: CreateBusinessSystemSuccess }
  | { ok: false; error: string };

const DEFAULT_ACTIVITIES: { title: string; stage: "pending" }[] = [
  { title: "Project setup", stage: "pending" },
  { title: "Design phase", stage: "pending" },
  { title: "Development phase", stage: "pending" },
];

/**
 * Full onboarding: company (+plan), membership, project, default activities.
 * Requires an authenticated Supabase user (memberships reference `auth.users`).
 */
export async function createBusinessSystem(
  input: CreateBusinessSystemInput
): Promise<CreateBusinessSystemResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    };
  }

  const name = input.businessName.trim();
  if (!name) {
    return { ok: false, error: "Business name is required." };
  }
  if (!input.industryId) {
    return { ok: false, error: "Please select an industry." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error:
        "Sign in to create your workspace. After authentication, submit again.",
    };
  }

  if (input.userId != null && input.userId !== "" && input.userId !== user.id) {
    return {
      ok: false,
      error: "Session mismatch. Please refresh the page and sign in again.",
    };
  }

  const planSlug = normalizePlanSlug(input.plan);
  const slug = slugifyBusinessName(name);

  const insertCompany: Record<string, unknown> = {
    name,
    slug,
    industry_id: input.industryId,
    plan: planSlug,
  };

  const email = user.email ?? undefined;
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  if (email) insertCompany.primary_contact_email = email;
  if (fullName) insertCompany.primary_contact_name = fullName;

  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .insert(insertCompany)
    .select("id, name, slug")
    .single();

  if (companyError) {
    if (companyError.code === "23505") {
      return {
        ok: false,
        error:
          "A workspace with this name already exists. Try a slightly different business name.",
      };
    }
    return { ok: false, error: companyError.message };
  }

  if (!companyRow?.id) {
    return { ok: false, error: "Company was not created." };
  }

  const companyId = companyRow.id as string;

  const { error: membershipError } = await supabase.from("memberships").insert({
    user_id: user.id,
    company_id: companyId,
    role: "owner",
  });

  if (membershipError) {
    console.error(
      "[onboarding] createBusinessSystem membership",
      membershipError.message
    );
    return {
      ok: false,
      error: `Workspace created but membership failed: ${membershipError.message}`,
    };
  }

  const projectName = `${name} Website Build`;

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      name: projectName,
      status: "pending",
      progress: 10,
      current_stage: "pending",
    })
    .select("id, name")
    .single();

  if (projectError) {
    console.error(
      "[onboarding] createBusinessSystem project",
      projectError.message
    );
    return {
      ok: false,
      error: `Company created but project setup failed: ${projectError.message}. You can retry from the dashboard.`,
    };
  }

  const projectId = projectRow?.id as string;

  const activityRows = DEFAULT_ACTIVITIES.map((a, index) => ({
    project_id: projectId,
    title: a.title,
    completed: false,
    stage: a.stage,
    sort_order: index,
  }));

  const { error: actError } = await supabase
    .from("project_activities")
    .insert(activityRows);

  if (actError) {
    console.error(
      "[onboarding] createBusinessSystem activities",
      actError.message
    );
    return {
      ok: false,
      error: `Project created but activities failed: ${actError.message}`,
    };
  }

  return {
    ok: true,
    data: {
      company: {
        id: companyId,
        slug: companyRow.slug as string,
        name: companyRow.name as string,
        plan: planSlug,
      },
      project: {
        id: projectId,
        name: projectName,
      },
    },
  };
}
