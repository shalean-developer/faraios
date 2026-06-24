"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  Globe,
  Sparkles,
  Users,
} from "lucide-react";

import { AuthBrandLogo } from "@/components/auth/auth-brand-logo";

type FeatureItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

export const AUTH_MARKETING_FEATURES: FeatureItem[] = [
  {
    id: "bookings",
    icon: <CalendarCheck className="h-4 w-4" aria-hidden />,
    title: "Bookings, CRM & customers",
    description: "Capture leads, manage customers, and organize every booking.",
  },
  {
    id: "payments",
    icon: <CreditCard className="h-4 w-4" aria-hidden />,
    title: "Quotes, invoices & payments",
    description: "Create quotes, send invoices, and accept payments from one place.",
  },
  {
    id: "marketing",
    icon: <Globe className="h-4 w-4" aria-hidden />,
    title: "Website, SEO & marketing",
    description:
      "Connect your existing site or add a FaraiOS-powered website later.",
  },
  {
    id: "team",
    icon: <Users className="h-4 w-4" aria-hidden />,
    title: "Team, tasks & reports",
    description: "Manage staff, track activity, and understand your business performance.",
  },
];

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

const MODULE_CARDS = [
  { id: "m1", label: "Bookings", icon: CalendarCheck, top: "18%", left: "72%" },
  { id: "m2", label: "Payments", icon: CreditCard, top: "42%", left: "78%" },
  { id: "m3", label: "Reports", icon: BarChart3, top: "62%", left: "68%" },
] as const;

export function AuthMarketingPanel() {
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-8 lg:flex lg:w-[52%] xl:p-10"
      style={{
        background: "linear-gradient(145deg, #1e0a3c 0%, #2d1b69 45%, #312e81 100%)",
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
          aria-hidden
        />
      ))}

      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      {MODULE_CARDS.map((card) => (
        <motion.div
          key={card.id}
          className="pointer-events-none absolute hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-lg backdrop-blur-sm xl:flex xl:items-center xl:gap-2"
          style={{ top: card.top, left: card.left }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          aria-hidden
        >
          <card.icon className="h-3.5 w-3.5 text-violet-300" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-100/80">
            {card.label}
          </span>
        </motion.div>
      ))}

      <div className="relative z-10">
        <AuthBrandLogo onDark />
      </div>

      <motion.div
        className="relative z-10"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp}>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-100">
            <Sparkles className="h-3 w-3" aria-hidden />
            <span>Built for growing service businesses</span>
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mb-3 text-3xl font-extrabold leading-[1.12] tracking-tight text-white xl:text-4xl"
        >
          Run your service business
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #c4b5fd, #a5b4fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            from one workspace.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mb-6 max-w-sm text-sm leading-relaxed text-violet-100/85"
        >
          Manage bookings, customers, payments, websites, SEO, marketing, and your
          team from one connected dashboard.
        </motion.p>

        <motion.ul variants={stagger} className="space-y-3">
          {AUTH_MARKETING_FEATURES.map((feat) => (
            <motion.li
              key={feat.id}
              variants={fadeUp}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-violet-200">
                {feat.icon}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-white">
                  {feat.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-violet-100/75">
                  {feat.description}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      <div className="relative z-10">
        <p className="text-xs text-violet-200/60">
          © {new Date().getFullYear()} FaraiOS —{" "}
          <span className="text-violet-100/80">Business OS for service businesses.</span>
        </p>
      </div>
    </div>
  );
}
