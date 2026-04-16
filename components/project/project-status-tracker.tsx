"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Layers,
  Play,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import {
  PROJECT_STAGES,
  dbStatusToStageKey,
  stageKeyToDbStatus,
  type StageDefinition,
  type StageIconId,
} from "@/lib/data/project-stages";
import type { ProjectTrackingDTO } from "@/types/project-tracking";
import { cn } from "@/lib/utils";

function iconNode(
  id: StageIconId,
  size: "sm" | "md" = "md",
  className?: string
) {
  const md = cn("h-5 w-5", className);
  const sm = cn("h-3.5 w-3.5", className);
  const box = size === "sm" ? sm : md;
  switch (id) {
    case "clock":
      return <Clock className={box} />;
    case "play":
      return <Play className={box} />;
    case "search":
      return <Search className={box} />;
    case "check":
      return <Check className={box} />;
    case "file":
      return <FileText className={box} />;
    case "users":
      return <Users className={box} />;
    case "calendar":
      return <CalendarDays className={box} />;
    case "layers":
      return <Layers className={box} />;
    case "sparkles":
      return <Sparkles className={box} />;
    default:
      return null;
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

type Props = {
  data: ProjectTrackingDTO;
};

export function ProjectStatusTracker({ data }: Props) {
  const gradId = useId();
  const currentKey = dbStatusToStageKey(data.status);
  const currentIndex =
    PROJECT_STAGES.find((s) => s.dbStatus === data.status)?.index ?? 0;

  const [viewingKey, setViewingKey] = useState(currentKey);

  useEffect(() => {
    setViewingKey(currentKey);
  }, [currentKey]);

  const activeData =
    PROJECT_STAGES.find((s) => s.key === viewingKey) ?? PROJECT_STAGES[0]!;

  const progress = data.progress_percentage;

  const getStageState = (stage: StageDefinition) => {
    if (stage.index < currentIndex) return "done";
    if (stage.index === currentIndex) return "active";
    return "upcoming";
  };

  const trackScale =
    currentIndex === 0 ? 0 : currentIndex === 1 ? 0.33 : currentIndex === 2 ? 0.66 : 1;

  const activitiesForView = useMemo(() => {
    const dbStage = stageKeyToDbStatus(viewingKey);
    const fromDb = data.activities.filter((a) => a.stage === dbStage);
    if (fromDb.length > 0) {
      return fromDb.map((a, i) => ({
        id: a.id,
        text: a.title,
        icon: activeData.fallbackActivityIcons[i % activeData.fallbackActivityIcons.length]!,
        done: a.completed,
      }));
    }
    return activeData.fallbackActivityTitles.map((text, i) => ({
      id: `fallback-${viewingKey}-${i}`,
      text,
      icon: activeData.fallbackActivityIcons[i % activeData.fallbackActivityIcons.length]!,
      done: false,
    }));
  }, [data.activities, activeData, viewingKey]);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden font-sans"
      style={{ background: "#f8f9fc" }}
    >
      <header className="flex w-full items-center justify-between border-b border-slate-100 bg-white px-6 py-5 shadow-sm md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="block text-base font-bold leading-tight tracking-tight text-slate-800">
              FaraiOS
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
              Project Tracker
            </span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Tracker nav">
          <Link
            href={`/${encodeURIComponent(data.company_slug)}/dashboard`}
            className="text-sm text-slate-400 transition-colors hover:text-slate-700"
          >
            Dashboard
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-slate-400 transition-colors hover:text-slate-700"
          >
            Pricing
          </Link>
          <span className="border-b border-indigo-500 pb-0.5 text-sm font-semibold text-slate-800">
            My Project
          </span>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-10 md:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <motion.div variants={fadeUp}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              <Sparkles className="h-3 w-3" />
              <span>Active Project</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-slate-900 md:text-3xl">
              {data.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Tracking your build from kickoff to go-live.
            </p>
            {!data.project_id && (
              <p className="mt-2 text-xs text-amber-700">
                Your project workspace is being prepared — tracker defaults will show until your
                build is scheduled in our system.
              </p>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex min-w-[120px] flex-shrink-0 flex-col items-center rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
          >
            <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Progress
            </span>
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 26 * (1 - progress / 100),
                  }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <motion.div
                key={progress}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-sm font-extrabold text-slate-800">{progress}%</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-6 rounded-2xl border border-slate-100 bg-white px-6 py-8 shadow-sm md:px-10"
        >
          <div className="relative flex items-start justify-between">
            <div className="absolute left-0 right-0 top-6 z-0 mx-8 h-[2px] bg-slate-100 md:mx-10" />
            <div className="absolute left-0 right-0 top-6 z-10 mx-8 overflow-hidden md:mx-10">
              <motion.div
                className="h-[2px] origin-left rounded-full bg-gradient-to-r from-indigo-400 to-violet-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: trackScale }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            {PROJECT_STAGES.map((stage) => {
              const state = getStageState(stage);
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setViewingKey(stage.key)}
                  className="group relative z-20 flex flex-1 flex-col items-center gap-2.5 focus:outline-none"
                >
                  <motion.div
                    layout
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200",
                      state === "active" &&
                        `bg-white shadow-lg ring-4 ${stage.ringColor} ${stage.glowColor} ${stage.color}`,
                      state === "done" &&
                        "border-transparent bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md",
                      state === "upcoming" &&
                        "border-slate-200 bg-slate-50 text-slate-300"
                    )}
                    animate={
                      state === "active"
                        ? {
                            scale: [1, 1.08, 1],
                            transition: { duration: 0.4 },
                          }
                        : { scale: 1 }
                    }
                  >
                    {state === "done" ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      iconNode(stage.icon, "md")
                    )}
                  </motion.div>
                  <div className="px-1 text-center">
                    <p
                      className={cn(
                        "text-xs font-bold leading-tight transition-colors duration-200",
                        state === "active" && stage.color,
                        state === "done" && "text-slate-700",
                        state === "upcoming" && "text-slate-300"
                      )}
                    >
                      {stage.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 hidden text-[10px] font-medium transition-colors duration-200 sm:block",
                        state === "active" && "text-slate-500",
                        state === "done" && "text-slate-400",
                        state === "upcoming" && "text-slate-300"
                      )}
                    >
                      {stage.status}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={viewingKey}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            <div
              className="h-1 w-full"
              style={{
                background: `linear-gradient(90deg, ${activeData.progressColor}80, ${activeData.progressColor})`,
              }}
            />

            <div className="px-6 py-7 md:px-8">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border",
                      activeData.badgeBg,
                      activeData.color
                    )}
                  >
                    {iconNode(activeData.icon, "md")}
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold leading-tight text-slate-900">
                      {activeData.label} Stage
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {activeData.timeframe}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest",
                    activeData.badgeBg,
                    activeData.badgeText
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: activeData.progressColor }}
                  />
                  <span>{activeData.status}</span>
                </span>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                {activeData.detail}
              </p>

              <div className="border-t border-slate-50 pt-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Stage Activities
                </p>
                <ul className="space-y-2.5">
                  {activitiesForView.map((activity) => (
                    <li key={activity.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border",
                          activeData.badgeBg,
                          activeData.color
                        )}
                      >
                        {iconNode(activity.icon, "sm")}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium text-slate-600",
                          activity.done && "text-emerald-700 line-through opacity-80"
                        )}
                      >
                        {activity.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 pb-6 md:px-8">
              <div className="flex flex-col gap-3 border-t border-slate-50 pt-4 sm:flex-row">
                {data.status === "completed" && viewingKey === "completed" ? (
                  <Link
                    href={`/${encodeURIComponent(data.company_slug)}/dashboard`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Check className="h-4 w-4" />
                    <span>Client Hub</span>
                  </Link>
                ) : null}
                <a
                  href="mailto:support@faraios.com?subject=Project%20question"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
                >
                  <span>Contact Team</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8 text-center"
        >
          <p className="text-xs text-slate-400">
            <span>Need help? </span>
            <a
              href="mailto:support@faraios.com"
              className="font-semibold text-indigo-500 hover:underline"
            >
              Contact your project manager
            </a>
            <span> — average response time under 2 hours.</span>
          </p>
          <p className="mt-4 text-[10px] text-slate-400">
            Planned next: in-app notifications, realtime updates, team chat, and file uploads.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
