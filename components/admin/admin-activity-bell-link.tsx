import Link from "next/link";
import { Bell } from "lucide-react";

export function AdminActivityBellLink() {
  return (
    <Link
      href="/admin/activity"
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800"
      aria-label="Open activity feed"
    >
      <Bell className="h-[18px] w-[18px]" />
    </Link>
  );
}
