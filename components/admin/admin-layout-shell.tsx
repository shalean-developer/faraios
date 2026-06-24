"use client";

import { usePathname } from "next/navigation";

import { AdminSidebarBrand } from "@/components/admin/admin-sidebar-brand";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminSidebarUser } from "@/components/admin/admin-sidebar-user";
import { resolveAdminNavKey } from "@/lib/constants/admin-nav";

export function AdminLayoutShell({
  adminDisplayName,
  adminEmail,
  workspaceSlug,
  children,
}: {
  adminDisplayName: string;
  adminEmail: string | null;
  workspaceSlug?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeNav = resolveAdminNavKey(pathname);

  return (
    <div
      className="flex h-screen w-full overflow-hidden font-sans"
      style={{ background: "#f8f7ff" }}
    >
      <aside className="flex h-full w-60 shrink-0 flex-col bg-slate-900 antialiased">
        <AdminSidebarBrand />
        <AdminSidebarNav activeNav={activeNav} />
        <AdminSidebarUser
          adminDisplayName={adminDisplayName}
          adminEmail={adminEmail}
          workspaceSlug={workspaceSlug}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
