import { NextResponse } from "next/server";

const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function applyPublicCorsHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PUBLIC_CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function publicCorsPreflightResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
}
