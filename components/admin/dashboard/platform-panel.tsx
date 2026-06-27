import Link from "next/link";
import type { ReactNode } from "react";

export function PlatformPanel({
  title,
  description,
  viewAllHref,
  viewAllLabel = "View all",
  emptyIcon: EmptyIcon,
  emptyMessage,
  isEmpty,
  children,
  footer,
}: {
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  emptyIcon?: React.ElementType;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-gray-400">{description}</p> : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {isEmpty && EmptyIcon && emptyMessage ? (
        <div className="py-14 text-center">
          <EmptyIcon className="mx-auto mb-2 h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
      {footer ? <div className="border-t border-gray-100">{footer}</div> : null}
    </section>
  );
}
