import type { BuilderWebsite, LandingPageContent } from "@/types/website-builder";
import type {
  WebsiteContactFormSettings,
  WebsiteFormField,
  WebsiteFormFieldType,
} from "@/types/website-builder-forms";

export const CONTACT_FORM_SETTINGS_KEY = "contactFormSettings";

const FIELD_LABELS: Record<WebsiteFormFieldType, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  service: "Service interested in",
  message: "Message",
};

export function createFormField(
  type: WebsiteFormFieldType,
  partial?: Partial<WebsiteFormField>
): WebsiteFormField {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    type,
    label: partial?.label ?? FIELD_LABELS[type],
    placeholder: partial?.placeholder,
    required: partial?.required ?? (type === "name" || type === "message"),
    visible: partial?.visible ?? true,
  };
}

export function defaultContactFormSettings(
  landing?: LandingPageContent | null
): WebsiteContactFormSettings {
  return {
    sectionHeading: landing?.contact.heading ?? "Contact us",
    sectionDescription: null,
    submitLabel: "Send message",
    successHeading: "Message sent",
    successMessage: "We will get back to you soon.",
    fields: [
      createFormField("name", { required: true }),
      createFormField("email"),
      createFormField("phone"),
      createFormField("service"),
      createFormField("message", { required: true }),
    ],
  };
}

function isFormField(value: unknown): value is WebsiteFormField {
  if (!value || typeof value !== "object") return false;
  const field = value as Record<string, unknown>;
  return typeof field.id === "string" && typeof field.type === "string" && typeof field.label === "string";
}

export function parseContactFormSettings(raw: unknown): WebsiteContactFormSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.fields)) return null;
  const fields = data.fields.filter(isFormField);
  if (fields.length === 0) return null;

  return {
    sectionHeading: typeof data.sectionHeading === "string" ? data.sectionHeading : "Contact us",
    sectionDescription:
      typeof data.sectionDescription === "string" ? data.sectionDescription : null,
    submitLabel: typeof data.submitLabel === "string" ? data.submitLabel : "Send message",
    successHeading: typeof data.successHeading === "string" ? data.successHeading : "Message sent",
    successMessage:
      typeof data.successMessage === "string"
        ? data.successMessage
        : "We will get back to you soon.",
    fields,
  };
}

export function getContactFormSettings(input: {
  website: BuilderWebsite;
  landing?: LandingPageContent | null;
}): WebsiteContactFormSettings {
  const stored = parseContactFormSettings(input.website.theme_settings[CONTACT_FORM_SETTINGS_KEY]);
  if (stored) return stored;
  return defaultContactFormSettings(input.landing);
}

export function visibleFormFields(settings: WebsiteContactFormSettings): WebsiteFormField[] {
  return settings.fields.filter((field) => field.visible);
}
