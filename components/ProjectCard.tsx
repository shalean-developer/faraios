import Link from "next/link";
import { Briefcase, Calendar, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

function statusStyles(status: Project["status"]) {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-800 ring-amber-200/90 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60";
    case "In Progress":
      return "bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/60";
    case "In Review":
      return "bg-violet-100 text-violet-800 ring-violet-200/90 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/60";
    case "Completed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/60";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

export type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm",
        "border-t-[3px] border-t-[#7C3AED]",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-[#7C3AED] dark:bg-violet-950/60 dark:text-violet-300"
          aria-hidden
        >
          <Briefcase className="size-5" strokeWidth={2} />
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            statusStyles(project.status)
          )}
        >
          {project.status}
        </span>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {project.name}
        </h2>
        <p className="text-sm text-muted-foreground">{project.category}</p>
      </div>

      <div className="mt-6 space-y-4 border-t border-border/60 pt-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4 shrink-0 text-[#7C3AED]/80" aria-hidden />
          <span>Created {project.date}</span>
        </p>

        <Link
          href={`/${project.slug}/dashboard`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 w-full gap-1 rounded-xl border-border/90 bg-background text-foreground shadow-none transition-all hover:border-[#7C3AED]/40 hover:bg-violet-50/60 hover:text-[#7C3AED] active:translate-y-px"
          )}
        >
          View Project
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
