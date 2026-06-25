"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { ClientOnly } from "@/components/client-only";
import { landingGreenBtnLg } from "@/components/marketing/home/landing-styles";
import { cn } from "@/lib/utils";

type EmailSignupFormProps = {
  onGetStarted?: () => void;
  className?: string;
  inputClassName?: string;
  buttonLabel?: string;
  size?: "md" | "lg";
};

const formClassName =
  "flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch";

function inputClassName(size: "md" | "lg", extra?: string) {
  return cn(
    "min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
    size === "lg" ? "py-3.5 text-base" : "py-3 text-sm",
    extra
  );
}

function buttonClassName(size: "md" | "lg") {
  return cn(landingGreenBtnLg, "group shrink-0", size === "md" && "px-6 py-3 text-sm");
}

function EmailSignupFormFallback({
  className,
  inputClassName: inputExtra,
  buttonLabel = "Get started",
  size = "md",
}: Pick<EmailSignupFormProps, "className" | "inputClassName" | "buttonLabel" | "size">) {
  return (
    <div className={cn(formClassName, className)} aria-hidden>
      <div className={cn(inputClassName(size, inputExtra), "text-slate-400")}>
        Enter your email
      </div>
      <div className={buttonClassName(size)}>
        {buttonLabel}
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
}

function EmailSignupFormFields({
  onGetStarted,
  className,
  inputClassName: inputExtra,
  buttonLabel = "Get started",
  size = "md",
}: EmailSignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onGetStarted) {
      onGetStarted();
      return;
    }
    const trimmed = email.trim();
    const href = trimmed
      ? `/auth/sign-up?email=${encodeURIComponent(trimmed)}`
      : "/auth/sign-up";
    router.push(href);
  };

  return (
    <form onSubmit={handleSubmit} className={cn(formClassName, className)}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        autoComplete="email"
        suppressHydrationWarning
        className={inputClassName(size, inputExtra)}
      />
      <button
        type="submit"
        suppressHydrationWarning
        className={buttonClassName(size)}
      >
        {buttonLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}

export function EmailSignupForm(props: EmailSignupFormProps) {
  return (
    <ClientOnly fallback={<EmailSignupFormFallback {...props} />}>
      <EmailSignupFormFields {...props} />
    </ClientOnly>
  );
}
