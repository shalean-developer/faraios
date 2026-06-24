import { cn } from "@/lib/utils";

type AuthFormCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
};

export function AuthFormCard({
  title,
  subtitle,
  children,
  className,
  footer,
}: AuthFormCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70",
        className
      )}
    >
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, #7c3aed, #4f46e5)" }}
        aria-hidden
      />

      <div className="px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
        <header className="mb-5">
          <h1 className="text-xl font-extrabold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{subtitle}</p>
        </header>

        {children}
      </div>

      {footer ? (
        <div className="border-t border-slate-100 px-6 py-4 sm:px-7">{footer}</div>
      ) : null}
    </div>
  );
}
