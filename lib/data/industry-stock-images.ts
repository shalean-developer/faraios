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

export function industryImagePreset(industry: string): IndustryImagePreset {
  const key = industry.trim().toLowerCase();
  if (key === "cleaning") return CLEANING;
  if (key === "plumbing") return PLUMBING;
  if (key === "gym" || key === "fitness") return GYM;
  return DEFAULT;
}
