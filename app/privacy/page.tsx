export const metadata = {
  title: "Privacy Policy — FaraiOS",
  description: "How FaraiOS collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        FaraiOS collects account, project, and operational data needed to
        provide the platform, including authentication information, onboarding
        details, bookings, and billing metadata.
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        We use this information to deliver services, improve reliability, and
        support customers. We do not sell your personal data. Access to data is
        restricted to authorized staff and systems needed to operate the
        service.
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        For privacy requests, contact{" "}
        <a className="text-indigo-600 hover:underline" href="mailto:support@faraios.com">
          support@faraios.com
        </a>
        .
      </p>
    </main>
  );
}
