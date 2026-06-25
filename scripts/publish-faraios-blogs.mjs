import { config } from "dotenv";

config({ path: ".env.local" });

const WP_USER = process.env.FARAIOS_WP_USER ?? "faraios";
const WP_APP_PASSWORD = (process.env.FARAIOS_WP_APP_PASSWORD ?? "").replace(/\s+/g, "");
const BOOK_URL = "https://www.faraios.com/book-your-cleaning";
const SITE_URL = "https://www.faraios.com";

function wpHeaders() {
  const token = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

async function wpFetch(path, options = {}) {
  const res = await fetch(`https://www.faraios.com/wp-json${path}`, {
    ...options,
    headers: { ...wpHeaders(), ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`WordPress ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

function block(type, inner) {
  return `<!-- wp:${type} -->\n${inner}\n<!-- /wp:${type} -->`;
}

function heading(text, level = 2) {
  return block(`heading {"level":${level}}`, `<h${level} class="wp-block-heading">${text}</h${level}>`);
}

function paragraph(html) {
  return block("paragraph", `<p>${html}</p>`);
}

function list(items, ordered = false) {
  const tag = ordered ? "ol" : "ul";
  const lis = items.map((item) => `<li>${item}</li>`).join("\n");
  return block(`list ${ordered ? '{"ordered":true}' : ""}`, `<${tag} class="wp-block-list">\n${lis}\n</${tag}>`);
}

const posts = [
  {
    title: "Move-In and Move-Out Cleaning Checklist for Cape Town Renters",
    slug: "move-in-move-out-cleaning-checklist-cape-town",
    status: "publish",
    categories: [66, 63],
    excerpt:
      "A practical move-in and move-out cleaning checklist for Cape Town renters — what landlords expect, room-by-room tasks, and when to hire professionals.",
    content: [
      paragraph(
        `Moving in Cape Town is exciting — new neighbourhood, new views, maybe the Atlantic Seaboard or the Southern Suburbs. But before you hand over keys or settle in, one thing can make or break your deposit: <strong>how clean the property is</strong>. Whether you are a tenant moving out or a new renter moving in, this <a href="${SITE_URL}/services">move-in and move-out cleaning checklist</a> will help you cover every corner and avoid last-minute stress.`
      ),
      heading("Why Move-In and Move-Out Cleaning Matters in Cape Town"),
      paragraph(
        "Landlords and rental agents in Cape Town typically expect properties to be returned in the same condition they were let — clean cupboards, sparkling bathrooms, and floors free of grime. Coastal humidity can leave bathrooms mould-prone, while kitchen grease and dust from open windows are common inspection issues. A thorough clean protects your deposit and gives you peace of mind in your new home."
      ),
      heading("Move-Out Cleaning Checklist: Room by Room"),
      heading("Kitchen", 3),
      list([
        "Degrease the oven, hob, and extractor fan",
        "Clean inside and outside of all cupboards and drawers",
        "Wipe down countertops, tiles, and splashbacks",
        "Clean the fridge and freezer inside and out",
        "Mop floors and clean skirting boards",
      ]),
      heading("Bathrooms", 3),
      list([
        "Scrub toilets, basins, baths, and showers",
        "Remove soap scum and limescale from taps and tiles",
        "Clean mirrors and polish fittings",
        "Wash shower curtains or scrub glass doors",
        "Mop floors and wipe walls where needed",
      ]),
      heading("Bedrooms and Living Areas", 3),
      list([
        "Dust all surfaces, shelves, and light fittings",
        "Clean inside wardrobes and cupboards",
        "Wipe windows, sills, and tracks",
        "Vacuum carpets or mop hard floors",
        "Remove marks from walls where possible",
      ]),
      heading("Move-In Cleaning: Start Fresh"),
      paragraph(
        `Even if the previous tenant cleaned, many new renters in Cape Town prefer a <strong>professional move-in clean</strong> before unpacking. Kitchens and bathrooms deserve extra attention — you want to know every surface is hygienic before you cook or bathe. FaraiOS Cleaning Services offers <a href="${BOOK_URL}">move-in and move-out cleaning</a> tailored to apartments, houses, and townhouses across Cape Town.`
      ),
      heading("When to Hire Professional Cleaners"),
      paragraph(
        "DIY cleaning works for smaller flats, but larger homes, end-of-lease inspections, or tight moving deadlines often call for professionals. Experienced cleaners bring the right products, tools, and checklist — and they work faster than most people can between packing boxes and booking a removal van."
      ),
      list([
        "You are moving out and need your full deposit back",
        "The property has not been cleaned in months",
        "You are moving into a home that feels dusty or neglected",
        "You simply do not have time during moving week",
      ]),
      heading("How FaraiOS Can Help"),
      paragraph(
        `At <a href="${SITE_URL}"><strong>FaraiOS Cleaning Services</strong></a>, we provide residential and commercial cleaning across Cape Town and surrounding areas. Our move-in/move-out service covers kitchens, bathrooms, floors, windows, and those easy-to-miss spots inspectors always check. <a href="${BOOK_URL}">Book a service online</a> in minutes and choose a time that fits your moving schedule.`
      ),
      heading("Final Tips Before the Inspection"),
      list([
        "Take photos of the property when you move in and before you move out",
        "Keep your rental agreement and incoming inspection report handy",
        "Book cleaners at least 2–3 days before your final walkthrough",
        "Do a final walk-through yourself the night before handover",
      ], true),
      paragraph(
        "A little planning goes a long way. Use this checklist, book help when you need it, and walk into your next chapter in Cape Town with a home that truly feels clean."
      ),
    ].join("\n\n"),
  },
  {
    title: "How Often Should You Book Professional House Cleaning in Cape Town?",
    slug: "how-often-book-professional-house-cleaning-cape-town",
    status: "publish",
    categories: [1, 65],
    excerpt:
      "Wondering how often to book professional house cleaning in Cape Town? We break down weekly, bi-weekly, and monthly schedules for busy households.",
    content: [
      paragraph(
        `Life in Cape Town moves fast — work, school runs, weekend plans, and the wind-blown dust that seems to appear the moment you open a window. Keeping up with house cleaning is tough, which is why many families ask: <strong>how often should I book professional house cleaning?</strong> The answer depends on your home, household size, and lifestyle. Here is a practical guide from <a href="${SITE_URL}">FaraiOS Cleaning Services</a>.`
      ),
      heading("Weekly Cleaning: Best for Busy Households"),
      paragraph(
        "Weekly professional cleaning suits families with children, pets, or home offices. Regular visits keep bathrooms sanitary, kitchens grease-free, and floors consistently clean — so you are not playing catch-up every weekend."
      ),
      list([
        "Families with young children or multiple occupants",
        "Homes with pets that shed hair and track in dirt",
        "People who work long hours and want weekends free",
        "Larger houses with several bathrooms",
      ]),
      heading("Bi-Weekly Cleaning: The Most Popular Option"),
      paragraph(
        "For many Cape Town households, <strong>cleaning every two weeks</strong> hits the sweet spot. It keeps the home fresh without the cost of weekly visits. Light tidying between visits — wiping kitchen surfaces, quick vacuuming — helps maintain the standard."
      ),
      list([
        "Couples or small families in apartments or townhouses",
        "Professionals who tidy regularly but want a deeper clean fortnightly",
        "Homes that do not see heavy daily foot traffic",
      ]),
      heading("Monthly Cleaning: For Low-Traffic Homes"),
      paragraph(
        "Monthly deep cleans work when you already maintain day-to-day tidiness but want professionals to handle the heavier tasks: scrubbing bathrooms, mopping thoroughly, dusting high surfaces, and cleaning inside appliances."
      ),
      heading("Factors That Change Your Schedule"),
      heading("Coastal Air and Dust", 3),
      paragraph(
        "Properties near the coast — Sea Point, Camps Bay, Blouberg — often need more frequent dusting and floor care. Salt air and open windows can leave surfaces gritty faster than inland suburbs."
      ),
      heading("Allergies and Health", 3),
      paragraph(
        "If someone in your home has allergies or asthma, more frequent cleaning reduces dust, pet dander, and mould risk — especially in bathrooms and bedrooms."
      ),
      heading("Entertaining and Lifestyle", 3),
      paragraph(
        "Love hosting braais or dinner parties? You might book an extra clean before big events, even on a bi-weekly plan. Occasional deep cleans before the holidays are also popular in Cape Town."
      ),
      heading("What Professional Cleaning Includes"),
      paragraph(
        `A standard <a href="${SITE_URL}/services">house cleaning service</a> from FaraiOS typically covers dusting, vacuuming, mopping, bathroom sanitising, kitchen wipe-downs, and making beds on request. <strong>Deep cleaning</strong> goes further — inside ovens, behind furniture, interior windows, and detailed grout work. Choose the service that matches how often you book.`
      ),
      heading("Signs You Should Book More Often"),
      list([
        "Bathrooms need scrubbing before your next scheduled visit",
        "Floors look dirty within days of cleaning",
        "You are constantly stressed about the state of your home",
        "You have not had time to clean properly in over a month",
      ]),
      heading("Book Cleaning That Fits Your Life"),
      paragraph(
        `There is no single right answer — only what works for your home and budget. Start with bi-weekly if you are unsure; you can always adjust. <a href="${BOOK_URL}"><strong>Book your cleaning service online with FaraiOS</strong></a> — choose your service type, pick a date, and let our vetted team handle the rest. We serve Cape Town and surrounding areas with reliable, professional <a href="${SITE_URL}/about-us-shalean-cleaning-services">residential cleaning</a> you can count on.`
      ),
      paragraph(
        "A cleaner home means more time for what matters — family, the beach, and everything Cape Town has to offer."
      ),
    ].join("\n\n"),
  },
];

async function main() {
  const results = [];

  for (const post of posts) {
    const existing = await wpFetch(
      `/wp/v2/posts?slug=${encodeURIComponent(post.slug)}&status=any`
    );
    if (existing.length > 0) {
      console.log(`Skipping (already exists): ${post.title}`);
      results.push({ title: post.title, link: existing[0].link, id: existing[0].id, skipped: true });
      continue;
    }

    const created = await wpFetch("/wp/v2/posts", {
      method: "POST",
      body: JSON.stringify({
        title: post.title,
        slug: post.slug,
        status: post.status,
        content: post.content,
        excerpt: post.excerpt,
        categories: post.categories,
      }),
    });

    console.log(`Published: ${created.title.rendered}`);
    console.log(`  URL: ${created.link}`);
    results.push({ title: created.title.rendered, link: created.link, id: created.id });
  }

  console.log("\nSummary:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
