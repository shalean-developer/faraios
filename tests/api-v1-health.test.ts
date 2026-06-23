import { describe, expect, it } from "vitest";

describe("external API health route contract", () => {
  it("requires X-FaraiOS-Company-Key header", async () => {
    const { GET } = await import("../app/api/v1/health/route");
    const response = await GET(
      new Request("http://localhost/api/v1/health", { method: "GET" })
    );
    expect(response.status).toBe(401);
    const body = (await response.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/Missing X-FaraiOS-Company-Key/i);
  });
});
