"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const HERO_PHOTOS = [
  {
    alt: "Technician installing equipment on site",
    src: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=480&h=360&fit=crop&q=80",
    className: "right-0 top-0 z-[1] h-40 w-52 sm:h-44 sm:w-56",
  },
  {
    alt: "Cleaner working in a home kitchen",
    src: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=480&h=360&fit=crop&q=80",
    className: "left-6 top-28 z-[1] h-36 w-44 sm:left-8 sm:top-24 sm:h-40 sm:w-48",
  },
] as const;

const ESTIMATE_PHOTO = {
  alt: "Moving team carrying furniture",
  src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=520&h=520&fit=crop&q=80",
} as const;

const SCHEDULE_JOBS = [
  { time: "8:00 AM", title: "House cleaning", meta: "Sarah M." },
  { time: "10:30 AM", title: "Office clean", meta: "Greenview Ltd" },
  { time: "1:00 PM", title: "Deep clean", meta: "J. Nkosi" },
] as const;

const DAY_CHIPS = ["Sat", "Sun", "Mon", "Tue", "Wed"] as const;
const TIME_SLOTS = ["9 AM – 10 AM", "11 AM – 12 PM", "1 PM – 2 PM", "3 PM – 4 PM"] as const;

function CollageCard({
  className,
  children,
  delay,
  floating = true,
}: {
  className?: string;
  children: ReactNode;
  delay: number;
  floating?: boolean;
}) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className={cn(
        "overflow-hidden rounded-2xl border border-white/90 bg-white shadow-xl shadow-slate-900/10",
        floating && "absolute",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function ScheduleCard() {
  return (
    <CollageCard className="left-0 top-0 z-20 w-[min(100%,17.5rem)] p-3 sm:w-72" delay={0.15}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-slate-900">Today</p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          9 jobs
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <div className="space-y-1.5">
          {SCHEDULE_JOBS.map((job) => (
            <div
              key={job.title}
              className="rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5"
            >
              <p className="text-[10px] font-semibold text-emerald-700">{job.time}</p>
              <p className="text-[11px] font-medium text-slate-900">{job.title}</p>
              <p className="text-[10px] text-slate-500">{job.meta}</p>
            </div>
          ))}
        </div>
        <div className="relative h-28 w-20 overflow-hidden rounded-xl bg-gradient-to-br from-sky-100 to-emerald-50">
          <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-emerald-600" />
          <div className="absolute left-2 top-8 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          <div className="absolute right-3 top-12 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" />
          <div className="absolute bottom-4 left-5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
        </div>
      </div>
      <div className="mt-2 flex gap-2 text-[10px] text-slate-500">
        <span>
          <strong className="text-slate-800">15h 35m</strong> est.
        </span>
        <span>
          <strong className="text-emerald-700">R2,860</strong> earnings
        </span>
      </div>
    </CollageCard>
  );
}

function DateTimeCard({
  className,
  floating = true,
}: {
  className?: string;
  floating?: boolean;
}) {
  return (
    <CollageCard
      className={cn(
        floating && "bottom-24 left-0 z-30 w-[min(100%,16.5rem)] p-3 sm:bottom-20 sm:w-64",
        className
      )}
      delay={0.3}
      floating={floating}
    >
      <p className="text-xs font-bold text-slate-900">Pick a date & time</p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {DAY_CHIPS.map((day, i) => (
          <span
            key={day}
            className={cn(
              "shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold",
              i === 2
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {day}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {TIME_SLOTS.map((slot, i) => (
          <span
            key={slot}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-center text-[10px] font-medium",
              i === 2
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-100 bg-white text-slate-600"
            )}
          >
            {slot}
          </span>
        ))}
      </div>
    </CollageCard>
  );
}

function EstimateCard({ className }: { className?: string }) {
  return (
    <CollageCard className={cn("p-3", className)} delay={0.45} floating={false}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Estimate
      </p>
      <p className="mt-0.5 text-xs font-bold text-slate-900">Couch removal</p>
      <div className="mt-2 space-y-1 text-[10px] text-slate-600">
        <div className="flex justify-between">
          <span>Service</span>
          <span>R185</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span className="text-emerald-600">-R10</span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold text-slate-900">
          <span>Total</span>
          <span>R175</span>
        </div>
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-xl bg-emerald-600 py-2 text-[11px] font-semibold text-white"
      >
        Book now
      </button>
    </CollageCard>
  );
}

function EstimatePhotoStack() {
  return (
    <motion.div
      custom={0.16}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="absolute bottom-0 right-0 z-20 w-56 pt-20 sm:right-2 sm:w-64 sm:pt-24"
    >
      <EstimateCard className="absolute top-0 left-1/2 z-30 w-[min(100%,15.5rem)] -translate-x-1/2 -translate-y-1/2 sm:w-60" />
      <div className="relative h-52 overflow-hidden rounded-2xl shadow-lg sm:h-60">
        <Image
          src={ESTIMATE_PHOTO.src}
          alt={ESTIMATE_PHOTO.alt}
          fill
          sizes="(max-width: 1024px) 224px, 256px"
          className="object-cover"
        />
      </div>
    </motion.div>
  );
}

export function HeroVisualCollage() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Desktop / tablet collage */}
      <div className="relative mx-auto hidden h-[28rem] max-w-[34rem] sm:block lg:mx-0 lg:h-[32rem] lg:max-w-none">
        {HERO_PHOTOS.map((photo, index) => (
          <motion.div
            key={photo.src}
            custom={index * 0.08}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className={cn("relative absolute overflow-hidden rounded-2xl shadow-lg", photo.className)}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 1024px) 220px, 260px"
              className="object-cover"
              priority={index === 0}
            />
          </motion.div>
        ))}

        <ScheduleCard />
        <DateTimeCard />
        <EstimatePhotoStack />
      </div>

      {/* Mobile: single photo + booking card */}
      <div className="space-y-4 sm:hidden">
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="relative h-44 overflow-hidden rounded-2xl shadow-lg"
        >
          <Image
            src={HERO_PHOTOS[1].src}
            alt={HERO_PHOTOS[1].alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </motion.div>
        <DateTimeCard floating={false} className="w-full p-3" />
      </div>
    </div>
  );
}
