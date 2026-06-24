import { NextResponse } from "next/server";

import { logPlatformApiRequest } from "@/lib/platform/api-log";

export async function withPlatformApiLog(
  request: Request,
  route: string,
  handler: () => Promise<NextResponse>,
  options?: { companyId?: string | null; isPublic?: boolean }
): Promise<NextResponse> {
  const startedAt = Date.now();
  let response: NextResponse;

  try {
    response = await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled API error";
    response = NextResponse.json({ ok: false, error: message }, { status: 500 });
    await logPlatformApiRequest({
      route,
      method: request.method,
      statusCode: 500,
      companyId: options?.companyId ?? null,
      durationMs: Date.now() - startedAt,
      errorMessage: message,
      isPublic: options?.isPublic ?? route.startsWith("/api/public"),
    });
    return response;
  }

  await logPlatformApiRequest({
    route,
    method: request.method,
    statusCode: response.status,
    companyId: options?.companyId ?? null,
    durationMs: Date.now() - startedAt,
    isPublic: options?.isPublic ?? route.startsWith("/api/public"),
  });

  return response;
}
