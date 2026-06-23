export const SERVICE_CATEGORY_PRESETS = [
  "Residential",
  "Commercial",
  "Deep clean",
  "Move-in / move-out",
  "Maintenance",
  "Other",
] as const;

export type ServiceTemplate = {
  name: string;
  category: string;
  description: string;
  price: string;
  durationMinutes: number;
  addons: { name: string; price: string }[];
};

export const CLEANING_SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    name: "Standard home clean",
    category: "Residential",
    description: "Kitchen, bathrooms, bedrooms, and living areas.",
    price: "450",
    durationMinutes: 120,
    addons: [
      { name: "Inside oven", price: "150" },
      { name: "Inside fridge", price: "100" },
    ],
  },
  {
    name: "Deep clean",
    category: "Deep clean",
    description: "Detailed clean including skirting, fixtures, and hard-to-reach areas.",
    price: "750",
    durationMinutes: 240,
    addons: [
      { name: "Inside cupboards", price: "200" },
      { name: "Windows (interior)", price: "150" },
    ],
  },
  {
    name: "Office clean",
    category: "Commercial",
    description: "Desks, floors, kitchenette, and restrooms.",
    price: "600",
    durationMinutes: 180,
    addons: [{ name: "Carpet shampoo", price: "300" }],
  },
  {
    name: "Move-in / move-out",
    category: "Move-in / move-out",
    description: "Empty property clean before handover or occupation.",
    price: "950",
    durationMinutes: 300,
    addons: [{ name: "Garage clean", price: "200" }],
  },
];
