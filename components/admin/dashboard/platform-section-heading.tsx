import Link from "next/link";

export function PlatformSectionHeading({
  title,
  links,
}: {
  title: string;
  links?: { href: string; label: string }[];
}) {
  if (!links?.length) {
    return (
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      <div className="flex items-center gap-3 text-xs font-semibold">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-indigo-600 hover:text-indigo-800">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
