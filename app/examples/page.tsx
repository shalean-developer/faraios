import { redirect } from "next/navigation";

export const metadata = {
  title: "Website Examples — Shalean",
  description: "Explore sample websites built by Shalean.",
};

/** Legacy URL — examples moved to the live marketplace. */
export default function ExamplesRedirectPage() {
  redirect("/marketplace");
}
