"use client";

import { useState, useTransition } from "react";

import { createPublicMarketplaceBooking } from "@/app/actions/marketplace-bookings";
import { Button } from "@/components/ui/button";
import type { MarketplaceListing } from "@/types/marketplace";

type Props = {
  listing: MarketplaceListing;
};

export function PublicBookingForm({ listing }: Props) {
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [service, setService] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createPublicMarketplaceBooking({
        companyId: listing.companyId,
        companySlug: listing.slug,
        customerName,
        customerEmail,
        customerPhone,
        service,
        bookingDate,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setService("");
      setBookingDate("");
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold text-gray-900">Book {listing.name}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Request a service. {listing.name} will confirm your booking.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Your name
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Full name"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Email
          <input
            required
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Phone
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Service
          <input
            required
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="e.g. Deep clean, office cleaning"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Preferred date & time
          <input
            required
            type="datetime-local"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Booking request sent. The business will contact you to confirm.
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="rounded-xl">
        {isPending ? "Sending request…" : "Request booking"}
      </Button>
    </form>
  );
}
