import Link from "next/link";

import { FaraiLogo } from "@/components/brand/farai-logo";

export function AdminSidebarBrand() {
  return (
    <div className="flex h-16 flex-shrink-0 items-center border-b border-slate-800 px-4">
      <Link
        href="/admin"
        className="inline-flex rounded-lg bg-white px-2.5 py-1.5 transition-opacity hover:opacity-90"
        aria-label="FaraiOS admin home"
      >
        <FaraiLogo size="sm" priority imageClassName="max-w-[132px]" />
      </Link>
    </div>
  );
}
