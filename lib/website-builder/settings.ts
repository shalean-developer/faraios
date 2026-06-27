import type { BuilderWebsite } from "@/types/website-builder";
import type { BuilderViewport } from "@/types/website-builder-sections";
import type {
  BuilderAutosaveDelayMs,
  WebsiteBuilderSettings,
} from "@/types/website-builder-settings";

export const BUILDER_SETTINGS_KEY = "builderSettings";

const VALID_DELAYS: BuilderAutosaveDelayMs[] = [1500, 2500, 5000];
const VALID_VIEWPORTS: BuilderViewport[] = ["desktop", "tablet", "mobile"];

export function defaultBuilderSettings(input?: {
  bookingEnabled?: boolean;
}): WebsiteBuilderSettings {
  return {
    preferences: {
      autoSave: true,
      autoSaveDelayMs: 2500,
      defaultPreviewViewport: "desktop",
      showPoweredBy: true,
    },
    preview: {
      shareEnabled: false,
      token: null,
      expiresAt: null,
    },
    integrations: {
      bookingEnabled: input?.bookingEnabled ?? true,
      nativeAnalyticsEnabled: true,
      inheritSeoAnalytics: true,
    },
    notifications: {
      emailOnEnquiry: true,
    },
  };
}

function parseDelay(raw: unknown): BuilderAutosaveDelayMs {
  if (typeof raw === "number" && VALID_DELAYS.includes(raw as BuilderAutosaveDelayMs)) {
    return raw as BuilderAutosaveDelayMs;
  }
  return 2500;
}

function parseViewport(raw: unknown): BuilderViewport {
  if (typeof raw === "string" && VALID_VIEWPORTS.includes(raw as BuilderViewport)) {
    return raw as BuilderViewport;
  }
  return "desktop";
}

export function parseBuilderSettings(raw: unknown): WebsiteBuilderSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const preferences = data.preferences;
  const preview = data.preview;
  const integrations = data.integrations;
  const notifications = data.notifications;

  if (
    !preferences ||
    typeof preferences !== "object" ||
    !preview ||
    typeof preview !== "object" ||
    !integrations ||
    typeof integrations !== "object" ||
    !notifications ||
    typeof notifications !== "object"
  ) {
    return null;
  }

  const prefs = preferences as Record<string, unknown>;
  const prev = preview as Record<string, unknown>;
  const ints = integrations as Record<string, unknown>;
  const notifs = notifications as Record<string, unknown>;

  return {
    preferences: {
      autoSave: prefs.autoSave !== false,
      autoSaveDelayMs: parseDelay(prefs.autoSaveDelayMs),
      defaultPreviewViewport: parseViewport(prefs.defaultPreviewViewport),
      showPoweredBy: prefs.showPoweredBy !== false,
    },
    preview: {
      shareEnabled: prev.shareEnabled === true,
      token: typeof prev.token === "string" ? prev.token : null,
      expiresAt: typeof prev.expiresAt === "string" ? prev.expiresAt : null,
    },
    integrations: {
      bookingEnabled: ints.bookingEnabled !== false,
      nativeAnalyticsEnabled: ints.nativeAnalyticsEnabled !== false,
      inheritSeoAnalytics: ints.inheritSeoAnalytics !== false,
    },
    notifications: {
      emailOnEnquiry: notifs.emailOnEnquiry !== false,
    },
  };
}

export function getBuilderSettings(input: {
  website: BuilderWebsite;
  bookingEnabled?: boolean;
}): WebsiteBuilderSettings {
  const stored = parseBuilderSettings(input.website.theme_settings[BUILDER_SETTINGS_KEY]);
  const defaults = defaultBuilderSettings({ bookingEnabled: input.bookingEnabled });

  if (!stored) return defaults;

  return {
    preferences: { ...defaults.preferences, ...stored.preferences },
    preview: { ...defaults.preview, ...stored.preview },
    integrations: {
      ...defaults.integrations,
      ...stored.integrations,
      bookingEnabled:
        input.bookingEnabled ?? stored.integrations.bookingEnabled ?? defaults.integrations.bookingEnabled,
    },
    notifications: { ...defaults.notifications, ...stored.notifications },
  };
}

export function buildPreviewShareUrl(slug: string, token: string, appUrl?: string): string {
  const base = appUrl?.replace(/\/$/, "") ?? "";
  const path = `/site/${encodeURIComponent(slug)}?preview=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

export function isPreviewTokenValid(
  settings: WebsiteBuilderSettings,
  token: string | null | undefined
): boolean {
  if (!token || !settings.preview.shareEnabled || !settings.preview.token) return false;
  if (settings.preview.token !== token) return false;
  if (settings.preview.expiresAt) {
    const expires = Date.parse(settings.preview.expiresAt);
    if (Number.isFinite(expires) && Date.now() > expires) return false;
  }
  return true;
}

export function builderAutosaveDelayMs(website: BuilderWebsite): number {
  const settings = getBuilderSettings({ website });
  if (!settings.preferences.autoSave) return 0;
  return settings.preferences.autoSaveDelayMs;
}
