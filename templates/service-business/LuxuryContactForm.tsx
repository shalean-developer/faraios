"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { luxury } from "@/templates/service-business/luxury-styles";

type Props = {
  services: string[];
  bookingUrl?: string | null;
  email?: string;
};

function ContactFormSkeleton() {
  const blockClass = "h-12 rounded-md bg-[#ddd8c4]";
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className={blockClass} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={blockClass} />
        <div className={blockClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={blockClass} />
        <div className={blockClass} />
      </div>
      <div className="h-28 rounded-md bg-[#ddd8c4]" />
      <div className="h-12 rounded-md bg-[#2a2018]/80" />
    </div>
  );
}

export function LuxuryContactForm({ services, bookingUrl, email }: Props) {
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const userEmail = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const service = String(data.get("service") ?? "").trim();
    const datetime = String(data.get("datetime") ?? "").trim();
    const notes = String(data.get("notes") ?? "").trim();

    if (bookingUrl) {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (userEmail) params.set("email", userEmail);
      if (phone) params.set("phone", phone);
      if (service) params.set("service", service);
      if (datetime) params.set("datetime", datetime);
      if (notes) params.set("notes", notes);
      const separator = bookingUrl.includes("?") ? "&" : "?";
      window.location.href = params.toString()
        ? `${bookingUrl}${separator}${params.toString()}`
        : bookingUrl;
      return;
    }

    if (email) {
      const subject = encodeURIComponent(`Booking enquiry${service ? `: ${service}` : ""}`);
      const body = encodeURIComponent(
        [
          `Name: ${name}`,
          `Email: ${userEmail}`,
          `Phone: ${phone}`,
          service ? `Service: ${service}` : "",
          datetime ? `Preferred date & time: ${datetime}` : "",
          notes ? `\nNotes:\n${notes}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      return;
    }

    setSubmitted(true);
  }

  const inputClass =
    "w-full rounded-md border-0 bg-[#ddd8c4] px-4 py-3.5 text-sm text-[#2d2926] placeholder:text-[#2d2926]/45 outline-none ring-0 focus:bg-[#d4cfb8]";

  if (!mounted) {
    return <ContactFormSkeleton />;
  }

  if (submitted) {
    return (
      <p
        className="rounded-md bg-[#ddd8c4] px-5 py-8 text-center text-base text-[#2d2926]"
        style={{ fontFamily: luxury.sans }}
      >
        Thank you — we&apos;ll be in touch shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="name"
        required
        placeholder="Full Name"
        className={inputClass}
        style={{ fontFamily: luxury.sans }}
        autoComplete="name"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="email"
          name="email"
          required
          placeholder="Email Address"
          className={inputClass}
          style={{ fontFamily: luxury.sans }}
          autoComplete="email"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          className={inputClass}
          style={{ fontFamily: luxury.sans }}
          autoComplete="tel"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <select
            name="service"
            defaultValue=""
            className={`${inputClass} appearance-none pr-10`}
            style={{ fontFamily: luxury.sans }}
          >
            <option value="" disabled>
              Select service
            </option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2d2926]/45" />
        </div>
        <input
          type="text"
          name="datetime"
          placeholder="Preferred date & time"
          className={inputClass}
          style={{ fontFamily: luxury.sans }}
        />
      </div>
      <textarea
        name="notes"
        rows={4}
        placeholder="Additional Notes"
        className={`${inputClass} resize-none`}
        style={{ fontFamily: luxury.sans }}
      />
      <button
        type="submit"
        className="w-full rounded-md bg-[#2a2018] py-4 text-sm font-semibold text-[#f5f3e7] transition hover:bg-[#1f1612]"
        style={{ fontFamily: luxury.sans }}
      >
        Submit
      </button>
    </form>
  );
}
