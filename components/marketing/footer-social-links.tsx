import { cn } from "@/lib/utils";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM4 10h5v11H4V10zm7 0h4.8v1.5h.1c.7-1.3 2.4-2.7 4.9-2.7 5.2 0 6.2 3.4 6.2 7.8V21h-5v-6.2c0-1.5 0-3.4-2.1-3.4-2.1 0-2.4 1.6-2.4 3.3V21h-5V10z" />
    </svg>
  );
}

const FOOTER_SOCIAL_ICONS = [
  { label: "Facebook", Icon: FacebookIcon },
  { label: "Instagram", Icon: InstagramIcon },
  { label: "LinkedIn", Icon: LinkedInIcon },
] as const;

export function FooterSocialLinks({ dark }: { dark: boolean }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      {FOOTER_SOCIAL_ICONS.map(({ label, Icon }) => (
        <span
          key={label}
          aria-label={label}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            dark
              ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              : "bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-emerald-600"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      ))}
    </div>
  );
}
