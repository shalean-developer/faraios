export type BookingWidgetPlatformGuide = {
  id: string;
  name: string;
  summary: string;
  steps: string[];
  tips?: string[];
};

export const BOOKING_WIDGET_PREREQUISITES = [
  "Publish your booking form under Operations → Booking form.",
  "Add at least one active service under Operations → Services.",
  "Keep Booking enabled turned on in the embed settings below.",
  "Use your own Business ID in the embed code (not another company’s ID).",
  "Copy the booking widget snippet and paste it on your external site.",
] as const;

export const BOOKING_WIDGET_TROUBLESHOOTING = [
  {
    issue: "Wrong business name on the form",
    fix: "The embed uses whichever Business ID is in your script or iframe URL. Copy the ID from this Connection page for your workspace.",
  },
  {
    issue: "Service dropdown is empty",
    fix: "Add active services under Operations → Services, then refresh your live page.",
  },
  {
    issue: "Double scrollbars or boxed-in form",
    fix: "Prefer the script embed, or use the iframe snippet with ?embed=1 (see Connection page). Avoid nesting a full FaraiOS page inside another booking section.",
  },
  {
    issue: "Form does not load on my site",
    fix: "Confirm the booking form is published, Booking enabled is on, and your Business ID is correct.",
  },
] as const;

export const BOOKING_WIDGET_PLATFORM_GUIDES: BookingWidgetPlatformGuide[] = [
  {
    id: "wordpress",
    name: "WordPress",
    summary: "Works with most WordPress themes via a custom HTML block or footer injection plugin.",
    steps: [
      "Sign in to your WordPress admin dashboard.",
      "Open the page or post where bookings should appear (for example “Book now”).",
      "Add a Custom HTML block and paste the FaraiOS booking widget snippet.",
      "Publish or update the page, then open it on your live site to confirm the form loads.",
      "Optional: add the tracking script site-wide with a plugin such as WPCode, Insert Headers and Footers, or your theme’s footer scripts area.",
    ],
    tips: [
      "For a booking page only, use a dedicated page with the widget snippet in the content area.",
      "If your theme strips script tags from page content, use a footer injection plugin instead.",
    ],
  },
  {
    id: "wix",
    name: "Wix",
    summary: "Embed the widget with Wix custom code on a page or across the whole site.",
    steps: [
      "Open your Wix site editor.",
      "Go to Settings → Custom Code (or Add → Embed → Custom embed on a specific page).",
      "Choose Add Code to Page for a booking page, or Add Code to All Pages for tracking.",
      "Paste the FaraiOS booking widget snippet into the code box.",
      "Set placement to Body – end, save, and publish your site.",
    ],
    tips: [
      "Use Add Code to Page on your “Book” page for the booking widget.",
      "Use Add Code to All Pages only for the tracking script.",
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    summary: "Add the script through Code Injection or a Code block on a booking page.",
    steps: [
      "Open Squarespace → Settings → Advanced → Code Injection.",
      "Paste the tracking script into Footer if you want site-wide analytics.",
      "For the booking form, edit the booking page and add a Code block.",
      "Paste the booking widget snippet into the Code block.",
      "Save and publish, then test the live page.",
    ],
    tips: [
      "Business plans and above support Code Injection.",
      "Keep the booking widget on one page; use Footer injection for tracking only.",
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    summary: "Install the widget on a booking page template or through theme footer code.",
    steps: [
      "In Shopify admin, go to Online Store → Themes → Edit code.",
      "To show bookings on one page, create or edit a page template and add a custom HTML section with the booking widget snippet.",
      "For site-wide tracking, paste the tracking script before </body> in theme.liquid.",
      "Save, then preview the booking page on your storefront.",
    ],
    tips: [
      "If you are not comfortable editing theme files, use a Shopify custom-liquid section or an app that allows footer scripts.",
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    summary: "Use an Embed element or project custom code to load the widget.",
    steps: [
      "Open your Webflow project and go to the booking page.",
      "Drag an Embed element where the form should appear.",
      "Paste the FaraiOS booking widget snippet into the embed.",
      "For tracking, open Project Settings → Custom Code → Footer Code and paste the tracking script.",
      "Publish the site and test the live URL.",
    ],
    tips: [
      "Place the embed inside a section with enough width; the widget is optimized for roughly 480px.",
    ],
  },
  {
    id: "godaddy",
    name: "GoDaddy Website Builder",
    summary: "Add the script with GoDaddy’s HTML or custom code section.",
    steps: [
      "Open your GoDaddy Website Builder and edit the site.",
      "Add a new section and choose HTML or Custom Code (wording varies by template).",
      "Paste the FaraiOS booking widget snippet.",
      "Save and publish the site.",
      "If your plan supports site-wide footer code, add the tracking script there.",
    ],
  },
  {
    id: "weebly",
    name: "Weebly",
    summary: "Embed the widget with Weebly’s Embed Code element.",
    steps: [
      "Open the Weebly editor on the page where bookings should appear.",
      "Drag Embed Code onto the page.",
      "Paste the FaraiOS booking widget snippet.",
      "Publish the site and open the live page to verify the form.",
      "For tracking, use Settings → SEO → Header Code or Footer Code if available on your plan.",
    ],
  },
  {
    id: "carrd",
    name: "Carrd",
    summary: "Use a Code element on Pro plans to embed the booking form.",
    steps: [
      "Open your Carrd site editor.",
      "Add a Code element (or Embed) where the booking form should appear.",
      "Paste the FaraiOS booking widget snippet.",
      "Save and publish the site.",
      "Add the tracking script to site-wide Footer code in Carrd settings if you use analytics.",
    ],
    tips: ["Carrd Pro or higher is usually required for custom code embeds."],
  },
  {
    id: "framer",
    name: "Framer",
    summary: "Load the widget with an Embed component or site custom code.",
    steps: [
      "Open your Framer project and select the booking page.",
      "Insert an Embed component where the form should render.",
      "Paste the FaraiOS booking widget snippet into the embed.",
      "For site-wide tracking, open Site Settings → General → Custom Code and add the tracking script to the end of the body.",
      "Publish and test the live site.",
    ],
  },
  {
    id: "iframe",
    name: "Iframe embed (any site builder)",
    summary: "Embed the hosted FaraiOS booking page when your builder blocks script tags.",
    steps: [
      "Copy the iframe snippet from Website → Connection.",
      "Paste it into an HTML, Embed, or Custom Code block on your booking page.",
      "Use the ?embed=1 URL so the form fits cleanly without extra page chrome.",
      "Set iframe height to at least 720px, or use min-height: 720px in CSS.",
      "Do not wrap the iframe inside another booking form — use either your page hero or the FaraiOS form, not both titles.",
    ],
    tips: [
      "The script embed is preferred when your platform allows it — it blends better with your site design.",
    ],
  },
  {
    id: "html",
    name: "HTML or static website",
    summary: "Paste the script directly into your HTML file before the closing </body> tag.",
    steps: [
      "Open the HTML file for your booking page in your code editor.",
      "Optional: add <div id=\"faraios-booking\"></div> where you want the form to appear.",
      "Paste the booking widget snippet before </body>.",
      "If you added a container div, include data-container-id=\"faraios-booking\" on the script tag.",
      "Deploy or upload the updated file and test the live page.",
    ],
    tips: [
      "If you skip the container div, the widget creates one automatically after the script tag.",
    ],
  },
  {
    id: "nextjs-react",
    name: "Next.js, React, or custom code (Cursor)",
    summary: "Load the embed script from a page component or layout using Next.js Script or a client component.",
    steps: [
      "Store your business ID in an environment variable such as NEXT_PUBLIC_FARAIOS_BUSINESS_ID.",
      "On your booking page, render a container div with id=\"faraios-booking\".",
      "Load the booking widget script with strategy=\"afterInteractive\" (Next.js) or append it in a client-side useEffect.",
      "Pass data-business-id and data-container-id=\"faraios-booking\" on the script tag.",
      "Deploy the site and submit a test booking to confirm it appears in FaraiOS → Bookings.",
    ],
    tips: [
      "You can link to the hosted booking page instead of embedding if you prefer a simpler setup.",
    ],
  },
];
