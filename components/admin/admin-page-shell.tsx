import type { ReactNode } from "react";

import {
  riseCardClassName,
  risePageClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        riseCardClassName,
        "mb-4 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function AdminPageShell({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  maxWidthClassName = "max-w-7xl",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidthClassName?: string;
}) {
  return (
    <div className={cn(risePageClassName, className)}>
      <AdminPageHeader
        title={title}
        description={description}
        actions={actions}
      />
      <div className={cn("mx-auto space-y-4", maxWidthClassName, contentClassName)}>
        {children}
      </div>
    </div>
  );
}
