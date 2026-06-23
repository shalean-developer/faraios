import Link from "next/link";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminSidebarBrand } from "@/components/admin/admin-sidebar-brand";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminSidebarUser } from "@/components/admin/admin-sidebar-user";
import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import type { Website } from "@/types/database";

type WebsiteWithCompany = Website & { companies?: { name?: string | null } | null };

export function FaraiAdminWebsites({
  websites,
  adminDisplayName,
  adminEmail,
}: {
  websites: WebsiteWithCompany[];
  adminDisplayName: string;
  adminEmail: string | null;
}) {
  return (
    <div
      className="flex h-screen w-full overflow-hidden font-sans"
      style={{ background: "#f8f7ff" }}
    >
      <aside className="flex h-full w-60 shrink-0 flex-col bg-slate-900">
        <AdminSidebarBrand />
        <AdminSidebarNav activeNav="websites" />
        <AdminSidebarUser
          adminDisplayName={adminDisplayName}
          adminEmail={adminEmail}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-gray-900">
              Websites
            </h1>
            <p className="mt-0.5 text-xs text-gray-400">
              Create and manage client websites
            </p>
          </div>
          <Link
            href="/admin/websites/create"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Create Website
          </Link>
          <AdminActivityBellLink />
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_auto_auto] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Business</span>
              <span>Client</span>
              <span>Industry</span>
              <span>Status</span>
              <span className="text-right">Action</span>
              <span className="text-right">Preview</span>
            </div>
            {websites.length > 0 ? (
              websites.map((website) => (
                <div
                  key={website.id}
                  className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_auto_auto] gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
                >
                  <span className="font-medium text-slate-900">{website.name}</span>
                  <span className="text-slate-600">
                    {website.companies?.name ?? "—"}
                  </span>
                  <span className="text-slate-600">{website.industry}</span>
                  <span className="text-slate-600">{website.status}</span>
                  <span className="text-right">
                    <Link
                      href={`/admin/websites/${website.id}/edit`}
                      className="font-medium text-violet-700 hover:text-violet-900"
                    >
                      Edit
                    </Link>
                  </span>
                  <span className="flex justify-end">
                    <PreviewWebsiteButton
                      websiteId={website.id}
                      domain={website.domain}
                    />
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No websites yet.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
