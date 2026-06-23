"use client";

import { type FormEvent, useState } from "react";

type BookingRow = {
  id: string;
  service: string | null;
  status: string | null;
  booking_date: string | null;
  scheduled_at: string | null;
};

export function PortalBookingsSection({
  token,
  bookings,
}: {
  token: string;
  bookings: BookingRow[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submitRequest = async (
    bookingId: string,
    requestType: "reschedule" | "cancel"
  ) => {
    setPendingId(bookingId);
    setMessage(null);
    const res = await fetch(`/api/public/portal/${token}/bookings/${bookingId}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType, message: "" }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setPendingId(null);
    if (data.ok) {
      setMessage("Request submitted. The business will contact you shortly.");
    } else {
      setMessage(data.error ?? "Could not submit request.");
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900">Bookings</h2>
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      <ul className="mt-4 space-y-3">
        {bookings.length === 0 ? (
          <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            No bookings to show.
          </li>
        ) : (
          bookings.map((booking) => (
            <li
              key={booking.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{booking.service ?? "Service"}</p>
                  <p className="text-sm text-slate-500 capitalize">
                    {booking.status?.replace(/_/g, " ")}
                    {booking.scheduled_at || booking.booking_date
                      ? ` — ${new Date(booking.scheduled_at ?? booking.booking_date ?? "").toLocaleDateString("en-ZA")}`
                      : ""}
                  </p>
                </div>
              </div>
              {!["completed", "cancelled"].includes(booking.status ?? "") ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={pendingId === booking.id}
                    onClick={() => submitRequest(booking.id, "reschedule")}
                    className="text-sm font-medium text-violet-700 hover:text-violet-900 disabled:opacity-50"
                  >
                    Request reschedule
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === booking.id}
                    onClick={() => submitRequest(booking.id, "cancel")}
                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Request cancellation
                  </button>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function PortalProfileSection({
  token,
  customer,
}: {
  token: string;
  customer: { name: string; email: string | null; phone: string | null };
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    const res = await fetch(`/api/public/portal/${token}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    setPending(false);
    if (res.ok) setSaved(true);
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900">Your profile</h2>
      <form
        onSubmit={onSave}
        className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium text-slate-700">Email</span>
          <input
            value={customer.email ?? ""}
            disabled
            className="mt-1 w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-500"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved ? <p className="mt-2 text-sm text-emerald-600">Profile updated.</p> : null}
      </form>
    </section>
  );
}

export function PortalReviewsSection({
  token,
  reviewLink,
  reviews,
}: {
  token: string;
  reviewLink: string | null;
  reviews: { id: string; status: string; created_at: string }[];
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900">Reviews</h2>
      {reviewLink ? (
        <a
          href={reviewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Leave a review
        </a>
      ) : null}
      <ul className="mt-4 space-y-2">
        {reviews.length === 0 ? (
          <li className="text-sm text-slate-500">No review requests yet.</li>
        ) : (
          reviews.map((r) => (
            <li key={r.id} className="text-sm text-slate-600">
              {new Date(r.created_at).toLocaleDateString("en-ZA")} — {r.status}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
