import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type DnsRecordType = "CNAME" | "A" | "TXT";

type DnsRecord = {
  id: string;
  record_type: DnsRecordType;
  host: string;
  value: string;
};

type WebsiteDomain = {
  id: string;
  company_id: string;
  domain: string;
  ssl_status: string;
  hosting_provider: string | null;
  provider_domain_id: string | null;
};

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

async function verifyDnsRecord(
  domain: string,
  recordType: DnsRecordType,
  host: string,
  expectedValue: string
): Promise<boolean> {
  const lookupDomain = host === "@" ? domain : `${host}.${domain}`;

  try {
    if (recordType === "TXT") {
      const records = await Deno.resolveDns(lookupDomain, "TXT");
      const flat = records.flat().join("");
      return flat.includes(expectedValue.replace(/"/g, ""));
    }
    if (recordType === "CNAME") {
      const records = await Deno.resolveDns(lookupDomain, "CNAME");
      const expected = expectedValue.toLowerCase().replace(/\.$/, "");
      return records.some((r) => r.toLowerCase().replace(/\.$/, "") === expected);
    }
    if (recordType === "A") {
      const records = await Deno.resolveDns(lookupDomain, "A");
      return records.includes(expectedValue);
    }
  } catch {
    return false;
  }
  return false;
}

async function verifyWebsiteDomain(
  supabase: ReturnType<typeof createClient>,
  websiteDomainId: string,
  companyId: string
): Promise<boolean> {
  const { data: domainRow, error: domainError } = await supabase
    .from("website_domains")
    .select("*")
    .eq("id", websiteDomainId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (domainError || !domainRow) return false;

  const domain = domainRow as WebsiteDomain;

  const { data: records } = await supabase
    .from("website_dns_records")
    .select("*")
    .eq("website_domain_id", websiteDomainId);

  const dnsRecords = (records ?? []) as DnsRecord[];
  const now = new Date().toISOString();
  let allVerified = dnsRecords.length > 0;

  for (const record of dnsRecords) {
    const verified = await verifyDnsRecord(
      domain.domain,
      record.record_type,
      record.host,
      record.value
    );

    await supabase
      .from("website_dns_records")
      .update({
        status: verified ? "verified" : "failed",
        last_checked_at: now,
      })
      .eq("id", record.id);

    if (!verified) allVerified = false;
  }

  const verificationStatus = allVerified ? "verified" : "pending";

  await supabase
    .from("website_domains")
    .update({
      verification_status: verificationStatus,
      ssl_status:
        allVerified && domain.ssl_status === "not_started" ? "pending" : domain.ssl_status,
      last_checked_at: now,
      updated_at: now,
    })
    .eq("id", websiteDomainId);

  if (allVerified) {
    await supabase
      .from("connected_websites")
      .update({ status: "verified", updated_at: now })
      .eq("company_id", companyId);
  }

  return allVerified;
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

  let verified = 0;
  let checked = 0;

  for (const row of pendingDomains ?? []) {
    const domainId = row.id as string;
    const companyId = row.company_id as string;
    const result = await verifyWebsiteDomain(supabase, domainId, companyId);
    checked += 1;
    if (result) verified += 1;
  }

  return new Response(JSON.stringify({ ok: true, checked, verified }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
