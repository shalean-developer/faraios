import type { AdminHealthStatus } from "@/types/admin";

const HEALTH_STYLES: Record<
  AdminHealthStatus,
  { label: string; dot: string; text: string }
> = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", text: "text-emerald-700" },
  warning: { label: "Warning", dot: "bg-amber-500", text: "text-amber-700" },
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-700" },
  unknown: { label: "Pending", dot: "bg-slate-300", text: "text-slate-500" },
};

export function PlatformHealthPill({
  label,
  status,
  detail,
}: {
  label: string;
  status: AdminHealthStatus;
  detail?: string;
}) {
  const style = HEALTH_STYLES[status];
  return (
    <div className="inline-flex shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${style.text}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>
      {detail ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500">{detail}</p>
      ) : null}
    </div>
  );
}
