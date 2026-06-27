import { Sparkles } from "lucide-react";

import { riseStatCardClassName } from "@/lib/ui/rise-dashboard-styles";

export function PlatformMetricCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  accent,
  suffix,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent: string;
  suffix?: string;
}) {
  return (
    <div className={riseStatCardClassName}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <Sparkles className="h-3.5 w-3.5 text-gray-200" />
      </div>
      <p className="text-xl font-extrabold text-gray-900">
        {value}
        {suffix ? (
          <span className="ml-1 text-sm font-semibold text-gray-400">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-gray-500">{label}</p>
      <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${accent} opacity-50`} />
    </div>
  );
}
