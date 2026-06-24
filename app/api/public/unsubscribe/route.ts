import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { unsubscribeEmail } from "@/lib/services/email-campaigns";

export async function GET(request: Request) {
  const route = "/api/public/unsubscribe";

  return withPlatformApiLog(
    request,
    route,
    async () => {
      const url = new URL(request.url);
      const companyId = url.searchParams.get("companyId")?.trim();
      const email = url.searchParams.get("email")?.trim();

      if (!companyId || !email) {
        return new NextResponse("Missing company or email.", { status: 400 });
      }

      await unsubscribeEmail(companyId, email);

      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;text-align:center">
      <h1>Unsubscribed</h1>
      <p>You have been unsubscribed from marketing emails.</p>
    </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    },
    { isPublic: true }
  );
}
