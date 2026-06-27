import type { BuilderViewport } from "@/types/website-builder-sections";

export type BuilderAutosaveDelayMs = 1500 | 2500 | 5000;

export type WebsiteBuilderSettings = {
  preferences: {
    autoSave: boolean;
    autoSaveDelayMs: BuilderAutosaveDelayMs;
    defaultPreviewViewport: BuilderViewport;
    showPoweredBy: boolean;
  };
  preview: {
    shareEnabled: boolean;
    token: string | null;
    expiresAt: string | null;
  };
  integrations: {
    bookingEnabled: boolean;
    nativeAnalyticsEnabled: boolean;
    inheritSeoAnalytics: boolean;
  };
  notifications: {
    emailOnEnquiry: boolean;
  };
};

export type PublishSnapshotSummary = {
  id: string;
  publishedAt: string;
  status: string;
  pageCount: number;
};
