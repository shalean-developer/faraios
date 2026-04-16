"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Bot,
  BarChart,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type FeatureItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

type OrbConfig = {
  id: string;
  width: number;
  height: number;
  top: string;
  left: string;
  gradient: string;
  duration: number;
  delay: number;
  xRange: number[];
  yRange: number[];
};

const FEATURES: FeatureItem[] = [
  {
    id: "f1",
    icon: <Zap className="h-4 w-4" />,
    title: "Instant Builds",
    description: "Launch your project at lightning speed",
  },
  {
    id: "f2",
    icon: <Bot className="h-4 w-4" />,
    title: "AI-Powered Workflow",
    description: "Intelligent automation at every step",
  },
  {
    id: "f3",
    icon: <BarChart className="h-4 w-4" />,
    title: "Live Analytics",
    description: "Real-time insights into your growth",
  },
  {
    id: "f4",
    icon: <Lock className="h-4 w-4" />,
    title: "Enterprise Security",
    description: "Bank-grade protection for your data",
  },
];

const ORBS: OrbConfig[] = [
  {
    id: "orb1",
    width: 320,
    height: 320,
    top: "-10%",
    left: "-10%",
    gradient:
      "radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(99,102,241,0.15) 60%, transparent 100%)",
    duration: 12,
    delay: 0,
    xRange: [0, 30, -20, 0],
    yRange: [0, -25, 15, 0],
  },
  {
    id: "orb2",
    width: 260,
    height: 260,
    top: "55%",
    left: "60%",
    gradient:
      "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(79,70,229,0.12) 60%, transparent 100%)",
    duration: 16,
    delay: 2,
    xRange: [0, -35, 20, 0],
    yRange: [0, 20, -30, 0],
  },
  {
    id: "orb3",
    width: 180,
    height: 180,
    top: "30%",
    left: "70%",
    gradient:
      "radial-gradient(circle, rgba(196,181,253,0.3) 0%, rgba(124,58,237,0.1) 60%, transparent 100%)",
    duration: 10,
    delay: 1,
    xRange: [0, 20, -10, 0],
    yRange: [0, -15, 25, 0],
  },
  {
    id: "orb4",
    width: 200,
    height: 200,
    top: "70%",
    left: "5%",
    gradient:
      "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.1) 60%, transparent 100%)",
    duration: 14,
    delay: 3,
    xRange: [0, 25, -15, 0],
    yRange: [0, -20, 10, 0],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

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
  initialMode?: AuthMode;
};

export function FaraiAuthPage({
  redirectTo = "/app",
  initialError,
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
    setMode(initialMode);
  }, [initialMode]);

  const finishSession = async () => {
    router.push(redirectTo);
    router.refresh();
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
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Enter your email above, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) setFormError(error.message);
      else setInfo("Check your email for a password reset link.");
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
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session) {
        await finishSession();
        return;
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(signupEmail)}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden font-sans">
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[52%]"
        style={{
          background:
            "linear-gradient(145deg, #1e0a3c 0%, #2d1b69 45%, #312e81 100%)",
        }}
      >
        {ORBS.map((orb) => (
          <motion.div
            key={orb.id}
            className="pointer-events-none"
            style={{
              position: "absolute",
              width: orb.width,
              height: orb.height,
              top: orb.top,
              left: orb.left,
              background: orb.gradient,
              borderRadius: "50%",
              filter: "blur(2px)",
            }}
            animate={{ x: orb.xRange, y: orb.yRange }}
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          />
        ))}

        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
            <Zap className="h-[18px] w-[18px] text-violet-300" />
          </div>
          <div>
            <span className="block text-base font-bold leading-tight tracking-tight text-white">
              FaraiOS
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
              Project Platform
            </span>
          </div>
        </div>

        <motion.div
          className="relative z-10"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-300">
              <Sparkles className="h-3 w-3" />
              <span>The Future of Building</span>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl"
          >
            From Idea
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #a78bfa, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              to Empire.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mb-10 max-w-xs text-sm leading-relaxed text-violet-200/70"
          >
            The all-in-one platform that takes your project from first commit
            to global scale — beautifully.
          </motion.p>

          <motion.ul variants={stagger} className="space-y-4">
            {FEATURES.map((feat) => (
              <motion.li
                key={feat.id}
                variants={fadeUp}
                className="flex items-start gap-3.5"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-violet-300">
                  {feat.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight text-white">
                    {feat.title}
                  </p>
                  <p className="mt-0.5 text-xs text-violet-200/60">
                    {feat.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <div className="relative z-10">
          <p className="text-xs text-violet-200/40">
            <span>© 2026 FaraiOS — </span>
            <span className="text-violet-300/60">
              Building the builder&apos;s toolkit.
            </span>
          </p>
        </div>
      </div>

      <div
        className="flex flex-1 items-center justify-center px-4 py-12 lg:py-0"
        style={{ background: "#f8f9fc" }}
      >
        <div className="fixed left-0 right-0 top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4 shadow-sm lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-800">
            FaraiOS
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mt-14 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 lg:mt-0">
            <div
              className="h-1 w-full"
              style={{
                background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
              }}
            />

            <div className="px-8 pb-6 pt-8">
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold leading-snug tracking-tight text-slate-900">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {mode === "login"
                    ? "Sign in to continue to your FaraiOS app."
                    : "Join thousands of builders on FaraiOS."}
                </p>
              </div>

              <div className="relative mb-7 flex items-center rounded-full bg-slate-100 p-1">
                <motion.div
                  className="absolute rounded-full bg-white shadow-sm"
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  style={{
                    width: "calc(50% - 4px)",
                    height: "calc(100% - 8px)",
                    top: 4,
                    left: mode === "login" ? 4 : "calc(50%)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setFormError(null);
                    setInfo(null);
                  }}
                  className={`relative z-10 flex-1 rounded-full py-2 text-sm font-semibold transition-colors duration-200 ${
                    mode === "login" ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setFormError(null);
                    setInfo(null);
                  }}
                  className={`relative z-10 flex-1 rounded-full py-2 text-sm font-semibold transition-colors duration-200 ${
                    mode === "signup" ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={busy}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-md disabled:opacity-60"
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
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                  OR
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {formError && (
                <p
                  className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {formError}
                </p>
              )}
              {info && (
                <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {info}
                </p>
              )}

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
                        className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                      >
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="password"
                          className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                        >
                          Password
                        </label>
                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={() => void handleForgotPassword()}
                            className="text-xs font-semibold text-indigo-500 transition-colors duration-150 hover:text-indigo-700 hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                          autoComplete={
                            mode === "login" ? "current-password" : "new-password"
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors duration-150 hover:text-slate-500"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="confirm-password"
                          className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) =>
                              setConfirmPassword(e.target.value)
                            }
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors duration-150 hover:text-slate-500"
                            aria-label={
                              showConfirmPassword
                                ? "Hide confirm password"
                                : "Show confirm password"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-60"
                      style={{
                        background:
                          "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                      }}
                    >
                      <span>
                        {mode === "login"
                          ? "Sign In to FaraiOS"
                          : "Create My Account"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                </AnimatePresence>
              </form>
            </div>

            <div className="px-8 pb-7 pt-1">
              <p className="text-center text-xs text-slate-400">
                {mode === "login" ? (
                  <span>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="font-semibold text-indigo-500 transition-colors duration-150 hover:underline"
                    >
                      Sign up free
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="font-semibold text-indigo-500 transition-colors duration-150 hover:underline"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </p>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-300">
                <span>By continuing, you agree to our </span>
                <Link href="/terms" className="text-slate-400 hover:underline">
                  Terms of Service
                </Link>
                <span> and </span>
                <Link href="/privacy" className="text-slate-400 hover:underline">
                  Privacy Policy
                </Link>
                <span>.</span>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            <span>Need help? </span>
            <a
              href="mailto:support@faraios.com"
              className="font-semibold text-indigo-500 hover:underline"
            >
              Contact support
            </a>
            <span> — average response under 2 hours.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
