"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { authCallbackUrl, authHref } from "@/lib/auth/safe-next-path";

type AuthMode = "login" | "signup";

const formVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const },
  },
};

export type FaraiAuthPageProps = {
  redirectTo?: string;
  initialError?: string;
  initialInfo?: string;
  initialMode?: AuthMode;
};

export function FaraiAuthPage({
  redirectTo = "/app",
  initialError,
  initialInfo,
  initialMode = "login",
}: FaraiAuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) setFormError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (initialInfo) setInfo(initialInfo);
  }, [initialInfo]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const finishSession = async () => {
    const res = await fetch(
      `/api/auth/post-login-redirect?next=${encodeURIComponent(redirectTo)}`
    );
    const payload = (await res.json()) as { path?: string };
    window.location.assign(payload.path ?? redirectTo);
  };

  const handleGoogle = async () => {
    setFormError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${authCallbackUrl(redirectTo)}`,
        },
      });
      if (error) setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInfo(null);

    if (mode === "signup" && password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "login") {
        const loginEmail = email.trim();
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) {
          setFormError(error.message);
          return;
        }
        await finishSession();
        return;
      }

      const signupEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${authCallbackUrl(redirectTo)}`,
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session) {
        await finishSession();
        return;
      }

      const nextQuery =
        redirectTo !== "/app"
          ? `&next=${encodeURIComponent(redirectTo)}`
          : "";
      router.push(
        `/auth/verify-email?email=${encodeURIComponent(signupEmail)}${nextQuery}`
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <AuthPageShell showSupport={!isLogin}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <AuthFormCard
          title={isLogin ? "Welcome back" : "Create your FaraiOS account"}
          subtitle={
            isLogin
              ? "Sign in to manage your workspace, bookings, customers, and business tools."
              : "Start your workspace and set up your business in minutes."
          }
          footer={
            <div className="space-y-2 text-center">
              <p className="text-xs text-slate-500">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <Link
                      href={authHref("/auth/sign-up", redirectTo)}
                      className="font-semibold text-violet-600 transition-colors hover:underline"
                    >
                      Create one
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Link
                      href={authHref("/auth/sign-in", redirectTo)}
                      className="font-semibold text-violet-600 transition-colors hover:underline"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </p>
              <p className="text-[10px] leading-relaxed text-slate-400">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-slate-500 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-slate-500 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          }
        >
          <div
            className="relative mb-5 flex items-center rounded-full bg-slate-100 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <motion.div
              className="absolute rounded-full bg-white shadow-sm"
              layout
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              style={{
                width: "calc(50% - 4px)",
                height: "calc(100% - 8px)",
                top: 4,
                left: isLogin ? 4 : "calc(50%)",
              }}
              aria-hidden
            />
            <Link
              href={authHref("/auth/sign-in", redirectTo)}
              role="tab"
              aria-selected={isLogin}
              aria-current={isLogin ? "page" : undefined}
              className={`relative z-10 flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors duration-200 ${
                isLogin ? "text-slate-900" : "text-slate-400"
              }`}
            >
              Sign in
            </Link>
            <Link
              href={authHref("/auth/sign-up", redirectTo)}
              role="tab"
              aria-selected={!isLogin}
              aria-current={!isLogin ? "page" : undefined}
              className={`relative z-10 flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors duration-200 ${
                !isLogin ? "text-slate-900" : "text-slate-400"
              }`}
            >
              Sign up
            </Link>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={busy}
            suppressHydrationWarning
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-md disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              OR
            </span>
            <div className="h-px flex-1 bg-slate-100" aria-hidden />
          </div>

          {formError ? (
            <p
              className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          {info ? (
            <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {info}
            </p>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} noValidate>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-widest text-slate-600"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    suppressHydrationWarning
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold uppercase tracking-widest text-slate-600"
                    >
                      Password
                    </label>
                    {isLogin ? (
                      <Link
                        href={
                          email.trim()
                            ? `/auth/forgot-password?email=${encodeURIComponent(email.trim())}`
                            : "/auth/forgot-password"
                        }
                        className="text-xs font-semibold text-violet-600 transition-colors hover:text-violet-800 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    ) : null}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      suppressHydrationWarning
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pr-11 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      required
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      suppressHydrationWarning
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                {!isLogin ? (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-bold uppercase tracking-widest text-slate-600"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        suppressHydrationWarning
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pr-11 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        suppressHydrationWarning
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  suppressHydrationWarning
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                  }}
                >
                  <span>{isLogin ? "Sign In" : "Create My Account"}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </motion.div>
            </AnimatePresence>
          </form>
        </AuthFormCard>
      </motion.div>
    </AuthPageShell>
  );
}
