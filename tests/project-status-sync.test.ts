import { describe, expect, it } from "vitest";
import { applyCompanyBuildStatus } from "../lib/services/projects";
import type { Project } from "../types/database";

const baseProject: Project = {
  id: "proj-1",
  company_id: "co-1",
  name: "sha Website Build",
  status: "pending",
  progress: 10,
  current_stage: "pending",
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("applyCompanyBuildStatus", () => {
  it("overrides project status when company build_status is set", () => {
    const merged = applyCompanyBuildStatus(baseProject, "in-progress");
    expect(merged.status).toBe("in_progress");
    expect(merged.progress).toBe(40);
    expect(merged.current_stage).toBe("in_progress");
  });

  it("keeps project row when company build_status is missing", () => {
    const merged = applyCompanyBuildStatus(baseProject, null);
    expect(merged.status).toBe("pending");
    expect(merged.progress).toBe(10);
  });

  it("maps review and completed build statuses", () => {
    expect(applyCompanyBuildStatus(baseProject, "review").status).toBe("review");
    expect(applyCompanyBuildStatus(baseProject, "completed").status).toBe(
      "completed"
    );
  });
});
