export const metadata = {
  title: "Terms of Service — FaraiOS",
  description: "Terms governing use of the FaraiOS platform.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        By using FaraiOS, you agree to use the platform lawfully and responsibly.
        Service features, pricing, and availability may change over time. You are
        responsible for safeguarding your account credentials and all activity in
        your workspace.
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        FaraiOS provides software and automation tooling on an as-is basis
        without guarantees of uninterrupted operation. To the maximum extent
        permitted by law, FaraiOS is not liable for indirect or consequential
        damages arising from use of the platform.
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Questions about these terms can be sent to{" "}
        <a className="text-indigo-600 hover:underline" href="mailto:support@faraios.com">
          support@faraios.com
        </a>
        .
      </p>
    </main>
  );
}
