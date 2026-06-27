export type WebsiteFormFieldType = "name" | "email" | "phone" | "service" | "message";

export type WebsiteFormField = {
  id: string;
  type: WebsiteFormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  visible: boolean;
};

export type WebsiteContactFormSettings = {
  sectionHeading: string;
  sectionDescription?: string | null;
  submitLabel: string;
  successHeading: string;
  successMessage: string;
  fields: WebsiteFormField[];
};
