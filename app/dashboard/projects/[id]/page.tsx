import Link from "next/link";
import { Navbar } from "@/components/Navbar";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar activeNav="projects" />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/projects" className="text-[#7C3AED] hover:underline">
            ← Back to projects
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Project {id}</h1>
        <p className="mt-2 text-muted-foreground">
          Detail view placeholder — connect to Supabase or your API here.
        </p>
      </main>
    </div>
  );
}
