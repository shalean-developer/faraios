import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "App — FaraiOS",
  description: "Your FaraiOS app home.",
};

export default async function AppHomePage() {
  let fallbackError = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/sign-in");
    }

    const { data: admin } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("IS ADMIN:", admin);

    if (admin) {
      redirect("/admin");
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select(
        `
        company_id,
        companies (
          slug
        )
      `
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      redirect("/onboarding");
    }

    type MembershipWithCompany = {
      companies?:
        | { slug?: string | null }
        | { slug?: string | null }[]
        | null;
    };
    const typedMembership = membership as MembershipWithCompany;
    const companySlug = Array.isArray(typedMembership.companies)
      ? typedMembership.companies[0]?.slug
      : typedMembership.companies?.slug;

    if (companySlug) {
      redirect(`/${encodeURIComponent(companySlug)}/dashboard`);
    }

    redirect("/onboarding");
  } catch {
    fallbackError = true;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {fallbackError ? "Routing problem" : "App"}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        We could not determine your workspace yet. Continue manually.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/onboarding"
          className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-900 shadow-sm hover:border-violet-200"
        >
          Continue onboarding
        </Link>
        <Link
          href="/pricing"
          className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-900 shadow-sm hover:border-violet-200"
        >
          Upgrade Plan
        </Link>
      </section>
    </main>
  );
}
