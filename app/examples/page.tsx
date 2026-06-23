import { redirect } from "next/navigation";

export const metadata = {
  title: "Website Examples — FaraiOS",
  description: "Explore sample websites built by FaraiOS.",
};

/** Legacy URL — examples moved to the live marketplace. */
export default function ExamplesRedirectPage() {
  redirect("/marketplace");
}
