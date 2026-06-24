import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const technologyServicesModule: IndustryModule = {
  slug: "technology",
  name: "Technology Services",
  description: "IT support, device repair, and technology projects",
  icon: "cpu",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "issue_type",
          type: "dropdown",
          label: "Issue type",
          options: [
            "Hardware repair",
            "Software support",
            "Network issue",
            "Data recovery",
            "New project",
            "Other",
          ],
          required: true,
          section: "Support request",
        },
        11
      ),
      field(
        {
          key: "device_type",
          type: "dropdown",
          label: "Device type",
          options: ["Laptop", "Desktop", "Phone", "Tablet", "Server", "Other"],
          section: "Support request",
        },
        12
      ),
      field(
        {
          key: "priority",
          type: "dropdown",
          label: "Priority",
          options: ["Low", "Normal", "High", "Critical"],
          section: "Support request",
        },
        13
      ),
      field(
        {
          key: "problem_description",
          type: "textarea",
          label: "Description",
          required: true,
          section: "Support request",
        },
        14
      ),
      field(
        {
          key: "attachments",
          type: "file",
          label: "Attachments",
          helperText: "Screenshots or photos of the issue.",
          section: "Support request",
        },
        15
      ),
      field(
        {
          key: "preferred_contact_method",
          type: "dropdown",
          label: "Preferred contact method",
          options: ["Email", "Phone", "WhatsApp"],
          section: "Contact",
        },
        16
      ),
    ]),
  },

  services: {
    categoryPresets: ["Support", "Repair", "Projects", "Maintenance", "Consulting"],
    templates: [
      {
        name: "Device repair",
        category: "Repair",
        description: "Diagnosis and repair for laptops, phones, and tablets.",
        price: "350",
        durationMinutes: 60,
        addons: [{ name: "Express turnaround", price: "200" }],
      },
      {
        name: "IT support (hourly)",
        category: "Support",
        description: "Remote or on-site technical support.",
        price: "450",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Website development",
        category: "Projects",
        description: "Custom website design and development.",
        price: "8500",
        durationMinutes: 480,
        addons: [{ name: "SEO setup", price: "1500" }],
      },
      {
        name: "Maintenance contract",
        category: "Maintenance",
        description: "Monthly IT maintenance and monitoring.",
        price: "1200",
        durationMinutes: 120,
        addons: [],
      },
    ],
  },

  workflows: [
    {
      name: "Create support task on booking",
      triggerType: "booking_created",
      steps: [
        {
          action: "create_task",
          config: { title: "New support request", priority: "medium" },
        },
      ],
      enabled: false,
    },
  ],

  growth: {
    seoPageTypes: ["service", "project"],
    contentSeeds: [
      { title: "Service pages", description: "IT and repair service landing pages", type: "service" },
    ],
    serviceLabel: "Technology Services",
    heroSubtitle:
      "Expert IT support, device repairs, and technology projects with fast response times.",
  },

  intelligence: {
    kpiDefinitions: [
      { key: "ticket_resolution_rate", label: "Support ticket resolution rate" },
      { key: "avg_response_time", label: "Average response time" },
    ],
    reportTemplates: [
      { key: "issues_by_type", label: "Issues by type" },
    ],
    aiPromptContext:
      "This is a technology services business. Focus on support tickets, device types, resolution times, and project pipeline.",
  },

  terminology: {
    booking: "Service request",
    service: "Service",
    staff: "Technician",
    customer: "Client",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for technology businesses",
      description: "Import common IT and repair services.",
    },
  },
};
