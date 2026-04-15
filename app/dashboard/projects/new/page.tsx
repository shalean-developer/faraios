import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar activeNav="projects" />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/projects" className="text-[#7C3AED] hover:underline">
            ← Back to projects
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold">New project</h1>
        <p className="mt-2 text-muted-foreground">
          Create flow placeholder — wire up a form and Supabase later.
        </p>
      </main>
    </div>
  );
}
