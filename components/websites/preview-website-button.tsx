"use client";

import { Eye } from "lucide-react";

type Props = {
  websiteId: string;
  domain: string | null;
};

export function PreviewWebsiteButton({ websiteId, domain }: Props) {
  const onClick = () => {
    if (domain && domain.trim()) {
      window.open(`https://${domain.trim()}`, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(`/preview/${websiteId}`, "_self");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Eye className="h-3.5 w-3.5" />
      Preview
    </button>
  );
}
