/** Curated Unsplash URLs for default website imagery (stable hotlinks). */

export type IndustryImagePreset = {
  heroImage: string;
  heroImageAlt: string;
  aboutImage: string;
  aboutImageAlt: string;
  serviceImages: string[];
};

const CLEANING: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Professional cleaner wiping a bright kitchen surface",
  aboutImage:
    "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Cleaning team preparing supplies for a service visit",
  serviceImages: [
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80",
  ],
};

const BEAUTY: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1540555700474-4be615f4946e?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Relaxing spa treatment room with soft lighting",
  aboutImage:
    "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Beauty therapist performing a facial treatment",
  serviceImages: [
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1570172619644-dfd955f45713?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1596178065887-1191b8b93f48?auto=format&fit=crop&w=800&q=80",
  ],
};

const REPAIRS: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1504149928374-438aa584ad31?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Repair technician with tools ready for a service call",
  aboutImage:
    "https://images.unsplash.com/photo-1581244277943-fe4cc9a3d0f7?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Technician repairing household equipment",
  serviceImages: [
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
  ],
};

const PLUMBING: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1607472586893-edb324bdc7b5?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Plumber working on residential pipe fittings",
  aboutImage:
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Plumbing tools laid out for a repair job",
  serviceImages: [
    "https://images.unsplash.com/photo-1585704032915-c3400ca4e335?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
  ],
};

const ELECTRICAL: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Electrician working on a residential electrical panel",
  aboutImage:
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Licensed electrician inspecting wiring",
  serviceImages: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80",
  ],
};

const FREELANCERS: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Freelancer collaborating on a creative project",
  aboutImage:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Professional workspace with laptop and notes",
  serviceImages: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
  ],
};

const CONSULTING: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Consultants in a strategy meeting",
  aboutImage:
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Business team reviewing plans together",
  serviceImages: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80",
  ],
};

const AGENCIES: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Creative agency team brainstorming campaign ideas",
  aboutImage:
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Marketing team collaborating in a modern office",
  serviceImages: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
  ],
};

const CONSTRUCTION: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Construction workers on an active building site",
  aboutImage:
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Construction team reviewing blueprints on site",
  serviceImages: [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1595846519845-68e298c2edd8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  ],
};

const GYM: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Modern gym with weights and training equipment",
  aboutImage:
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Trainer supporting a member during a workout",
  serviceImages: [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17261?auto=format&fit=crop&w=800&q=80",
  ],
};

const DEFAULT: IndustryImagePreset = {
  heroImage:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
  heroImageAlt: "Professional local business workspace",
  aboutImage:
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80",
  aboutImageAlt: "Team collaborating on client work",
  serviceImages: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
  ],
};

const PRESETS: Record<string, IndustryImagePreset> = {
  cleaning: CLEANING,
  beauty: BEAUTY,
  repairs: REPAIRS,
  plumbing: PLUMBING,
  electrical: ELECTRICAL,
  freelancers: FREELANCERS,
  consulting: CONSULTING,
  agencies: AGENCIES,
  construction: CONSTRUCTION,
  gym: GYM,
  fitness: GYM,
};

export function industryImagePreset(industry: string): IndustryImagePreset {
  const key = industry.trim().toLowerCase();
  return PRESETS[key] ?? DEFAULT;
}
