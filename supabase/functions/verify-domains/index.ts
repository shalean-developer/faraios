import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (serviceKey && token === serviceKey) return true;
  if (cronSecret && token === cronSecret) return true;
  return false;
}

async function invokeAppVerifyDomainsCron(): Promise<Response | null> {
  const appUrl = Deno.env.get("FARAIOS_APP_URL")?.trim().replace(/\/$/, "");
  if (!appUrl) return null;

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cronSecret) {
    headers.Authorization = `Bearer ${cronSecret}`;
  }

  try {
    return await fetch(`${appUrl}/api/cron/verify-domains`, {
      method: "POST",
      headers,
      body: "{}",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "App cron request failed";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const appResponse = await invokeAppVerifyDomainsCron();
  if (appResponse) {
    const body = await appResponse.text();
    return new Response(body, {
      status: appResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "Not configured." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: pendingDomains, error } = await supabase
    .from("website_domains")
    .select("id, company_id")
    .eq("verification_status", "pending")
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      checked: pendingDomains?.length ?? 0,
      verified: 0,
      errors: [
        "Set FARAIOS_APP_URL on the edge function to enable Plesk DNS re-sync before verification.",
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
