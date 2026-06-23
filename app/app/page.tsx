import { redirect } from "next/navigation";

import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "App — FaraiOS",
  description: "Your FaraiOS app home.",
};

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const path = await resolvePostLoginPath(supabase, user.id, "/app");
  redirect(path);
}
