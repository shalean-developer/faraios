import { redirect } from "next/navigation";

export default async function AuthIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const query = new URLSearchParams();
  if (error) query.set("error", error);
  const suffix = query.toString();
  redirect(`/auth/sign-in${suffix ? `?${suffix}` : ""}`);
}
