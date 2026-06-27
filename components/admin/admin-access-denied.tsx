import Link from "next/link";

import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

export function AdminAccessDenied() {
  return (
    <div className={cn(risePageClassName, "flex min-h-screen flex-col items-center justify-center")}>
      <div className={cn(riseCardClassName, "max-w-md p-8 text-center")}>
        <h1 className="text-xl font-bold text-slate-900">Admin access required</h1>
        <p className="mt-2 text-sm text-slate-500">
          This area is restricted to platform administrators. Ask an owner to add
          your account to{" "}
          <code className="rounded bg-slate-100 px-1">platform_admins</code> in
          Supabase, then sign in again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-[#5a8dee] hover:text-[#4a6fd8]"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
