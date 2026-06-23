export type WebsiteExample = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export const websiteExamples: WebsiteExample[] = [
  {
    id: "luxe-interiors",
    name: "Luxe Interiors Co.",
    description: "Luxury interior design studio website with project showcase.",
    category: "Interior design",
  },
  {
    id: "greenleaf-dental",
    name: "GreenLeaf Dental",
    description: "Patient-focused dental practice site with booking highlights.",
    category: "Healthcare",
  },
  {
    id: "summit-legal",
    name: "Summit Legal Group",
    description: "Professional law firm website with service pages and contact funnel.",
    category: "Legal",
  },
  {
    id: "urban-fitness",
    name: "Urban Fitness Hub",
    description: "Modern gym website built for memberships and class discovery.",
    category: "Fitness",
  },
];
