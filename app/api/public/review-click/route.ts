import { NextResponse } from "next/server";

import { withPlatformApiLog } from "@/lib/platform/with-api-log";
import { markReviewRequestClicked } from "@/lib/services/review-requests";

export async function GET(request: Request) {
  const route = "/api/public/review-click";

  return withPlatformApiLog(
    request,
    route,
    async () => {
      const url = new URL(request.url);
      const requestId = url.searchParams.get("requestId")?.trim();
      const redirect = url.searchParams.get("redirect")?.trim();

      if (!requestId || !redirect) {
        return NextResponse.json({ ok: false, error: "Missing parameters." }, { status: 400 });
      }

      try {
        const parsed = new URL(redirect);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return NextResponse.json({ ok: false, error: "Invalid redirect." }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid redirect." }, { status: 400 });
      }

      await markReviewRequestClicked(requestId);

      return NextResponse.redirect(redirect, 302);
    },
    { isPublic: true }
  );
}
