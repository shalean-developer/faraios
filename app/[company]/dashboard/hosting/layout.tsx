import { CompanyHostingShell } from "@/components/hosting/company-hosting-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ company: string }>;
};

export default async function CompanyHostingLayout({ children, params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  return <CompanyHostingShell slug={slug}>{children}</CompanyHostingShell>;
}
