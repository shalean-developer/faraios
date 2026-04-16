import Link from "next/link";

import { CreateWebsiteForm } from "@/components/websites/create-website-form";

export const metadata = {
  title: "Create Website — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CreateWebsitePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/app"
          className="text-sm font-medium text-violet-700 transition-colors hover:text-violet-900"
        >
          ← Back to app
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Create website
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Start a new draft website for your client. You can connect a domain and publish later.
      </p>
      <div className="mt-6">
        <CreateWebsiteForm />
      </div>
    </main>
  );
}
