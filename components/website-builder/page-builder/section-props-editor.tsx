"use client";

import type { HeroSectionProps, WebsiteSection } from "@/types/website-builder-sections";

import { HeroSectionEditor } from "./hero-section-editor";
import { BuilderImageGalleryUpload, BuilderImageUploadField } from "./builder-image-upload-field";
import { inputClass, StatListEditor, StringListEditor, TextField } from "./editor-fields";

type Props = {
  section: WebsiteSection;
  websiteId: string;
  companyId?: string;
  onChange: (props: WebsiteSection["props"]) => void;
};

export function SectionPropsEditor({ section, websiteId, companyId, onChange }: Props) {
  const props = section.props as Record<string, unknown>;

  function patch(partial: Record<string, unknown>) {
    onChange({ ...props, ...partial });
  }

  if (section.type === "hero") {
    return (
      <HeroSectionEditor
        value={section.props as HeroSectionProps}
        websiteId={websiteId}
        companyId={companyId}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (section.type === "about" || section.type === "cta-banner") {
    return (
      <div className="space-y-4">
        <TextField
          label="Heading"
          value={(props.heading as string) ?? ""}
          onChange={(heading) => patch({ heading })}
        />
        <TextField
          label="Body"
          value={(props.body as string) ?? ""}
          onChange={(body) => patch({ body })}
          multiline
          placeholder="Use {{business_name}}, {{phone}}, etc."
        />
        {section.type === "cta-banner" ? (
          <>
            <TextField
              label="Button label"
              value={(props.buttonLabel as string) ?? ""}
              onChange={(buttonLabel) => patch({ buttonLabel })}
            />
            <TextField
              label="Button link"
              value={(props.buttonHref as string) ?? "{{booking_url}}"}
              onChange={(buttonHref) => patch({ buttonHref })}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (section.type === "services" || section.type === "pricing") {
    const items = (props.items as { title: string; description: string; priceFrom?: string }[]) ?? [];
    return (
      <div className="space-y-4">
        <TextField
          label="Heading"
          value={(props.heading as string) ?? ""}
          onChange={(heading) => patch({ heading })}
        />
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-500">Items</legend>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="rounded-md border border-slate-100 p-2">
                <TextField
                  label="Title"
                  value={item.title}
                  onChange={(title) => {
                    const next = [...items];
                    next[index] = { ...item, title };
                    patch({ items: next });
                  }}
                />
                <TextField
                  label="Description"
                  value={item.description}
                  onChange={(description) => {
                    const next = [...items];
                    next[index] = { ...item, description };
                    patch({ items: next });
                  }}
                  multiline
                  rows={2}
                />
                <TextField
                  label={section.type === "pricing" ? "Price" : "Price from (optional)"}
                  value={item.priceFrom ?? ""}
                  onChange={(priceFrom) => {
                    const next = [...items];
                    next[index] = { ...item, priceFrom };
                    patch({ items: next });
                  }}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-[#4a6fd8]"
            onClick={() =>
              patch({
                items: [...items, { title: "New item", description: "", priceFrom: "" }],
              })
            }
          >
            + Add item
          </button>
        </fieldset>
      </div>
    );
  }

  if (section.type === "why-choose-us" || section.type === "logos") {
    return (
      <div className="space-y-4">
        {section.type === "why-choose-us" ? (
          <>
            <TextField
              label="Heading"
              value={(props.heading as string) ?? ""}
              onChange={(heading) => patch({ heading })}
            />
            <StringListEditor
              label="Bullet points"
              items={(props.items as string[]) ?? []}
              onChange={(items) => patch({ items })}
            />
          </>
        ) : (
          <>
            <TextField
              label="Heading (optional)"
              value={(props.heading as string) ?? ""}
              onChange={(heading) => patch({ heading })}
            />
            <BuilderImageGalleryUpload
              label="Partner logos"
              websiteId={websiteId}
              companyId={companyId}
              images={(props.items as string[]) ?? []}
              onChange={(items) => patch({ items })}
            />
          </>
        )}
      </div>
    );
  }

  if (section.type === "faq") {
    const items = (props.items as { question: string; answer: string }[]) ?? [];
    return (
      <div className="space-y-4">
        <TextField
          label="Heading"
          value={(props.heading as string) ?? ""}
          onChange={(heading) => patch({ heading })}
        />
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-500">Questions</legend>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="space-y-2 rounded-md border border-slate-100 p-2">
                <TextField
                  label="Question"
                  value={item.question}
                  onChange={(question) => {
                    const next = [...items];
                    next[index] = { ...item, question };
                    patch({ items: next });
                  }}
                />
                <TextField
                  label="Answer"
                  value={item.answer}
                  onChange={(answer) => {
                    const next = [...items];
                    next[index] = { ...item, answer };
                    patch({ items: next });
                  }}
                  multiline
                  rows={2}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-[#4a6fd8]"
            onClick={() => patch({ items: [...items, { question: "", answer: "" }] })}
          >
            + Add question
          </button>
        </fieldset>
      </div>
    );
  }

  if (section.type === "footer") {
    return (
      <div className="space-y-4">
        <TextField
          label="Business name"
          value={(props.businessName as string) ?? ""}
          onChange={(businessName) => patch({ businessName })}
          placeholder="{{business_name}}"
        />
        <TextField
          label="Tagline"
          value={(props.tagline as string) ?? ""}
          onChange={(tagline) => patch({ tagline })}
          placeholder="Optional tagline"
        />
      </div>
    );
  }

  if (section.type === "testimonials") {
    const items =
      (props.items as { name: string; quote: string; role?: string; rating?: number }[]) ?? [];
    return (
      <div className="space-y-4">
        <TextField
          label="Heading"
          value={(props.heading as string) ?? ""}
          onChange={(heading) => patch({ heading })}
        />
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-500">Reviews</legend>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="space-y-2 rounded-md border border-slate-100 p-2">
                <TextField label="Name" value={item.name} onChange={(name) => {
                  const next = [...items];
                  next[index] = { ...item, name };
                  patch({ items: next });
                }} />
                <TextField label="Role (optional)" value={item.role ?? ""} onChange={(role) => {
                  const next = [...items];
                  next[index] = { ...item, role };
                  patch({ items: next });
                }} />
                <TextField label="Quote" value={item.quote} onChange={(quote) => {
                  const next = [...items];
                  next[index] = { ...item, quote };
                  patch({ items: next });
                }} multiline rows={2} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-[#4a6fd8]"
            onClick={() => patch({ items: [...items, { name: "", quote: "", role: "" }] })}
          >
            + Add review
          </button>
        </fieldset>
      </div>
    );
  }

  if (section.type === "team") {
    const items = (props.items as { name: string; role: string; bio?: string; imageUrl?: string }[]) ?? [];
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-500">Team members</legend>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="space-y-2 rounded-md border border-slate-100 p-2">
                <TextField label="Name" value={item.name} onChange={(name) => {
                  const next = [...items];
                  next[index] = { ...item, name };
                  patch({ items: next });
                }} />
                <TextField label="Role" value={item.role} onChange={(role) => {
                  const next = [...items];
                  next[index] = { ...item, role };
                  patch({ items: next });
                }} />
                <BuilderImageUploadField
                  label="Photo"
                  websiteId={websiteId}
                  companyId={companyId}
                  value={item.imageUrl}
                  onChange={(imageUrl) => {
                    const next = [...items];
                    next[index] = { ...item, imageUrl: imageUrl ?? undefined };
                    patch({ items: next });
                  }}
                  compact
                />
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-xs font-medium text-[#4a6fd8]" onClick={() => patch({ items: [...items, { name: "", role: "" }] })}>
            + Add member
          </button>
        </fieldset>
      </div>
    );
  }

  if (section.type === "gallery") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <BuilderImageGalleryUpload
          label="Gallery images"
          websiteId={websiteId}
          companyId={companyId}
          images={(props.images as string[]) ?? []}
          onChange={(images) => patch({ images })}
        />
      </div>
    );
  }

  if (section.type === "contact") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <TextField label="Phone" value={(props.phone as string) ?? "{{phone}}"} onChange={(phone) => patch({ phone })} />
        <TextField label="Email" value={(props.email as string) ?? "{{email}}"} onChange={(email) => patch({ email })} />
        <TextField label="Location" value={(props.location as string) ?? "{{city}}"} onChange={(location) => patch({ location })} />
        <TextField label="Hours" value={(props.hours as string) ?? ""} onChange={(hours) => patch({ hours })} />
      </div>
    );
  }

  if (section.type === "booking-cta" || section.type === "booking-form") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <TextField label="Subheading" value={(props.subheading as string) ?? ""} onChange={(subheading) => patch({ subheading })} multiline rows={2} />
        {section.type === "booking-cta" ? (
          <TextField label="Button label" value={(props.buttonLabel as string) ?? "Book Now"} onChange={(buttonLabel) => patch({ buttonLabel })} />
        ) : (
          <p className="text-xs text-slate-500">Embeds the live booking form at publish time.</p>
        )}
      </div>
    );
  }

  if (section.type === "map") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <TextField
          label="Google Maps embed URL"
          value={(props.embedUrl as string) ?? ""}
          onChange={(embedUrl) => patch({ embedUrl })}
          placeholder="https://www.google.com/maps/embed?..."
        />
        <TextField label="Address label" value={(props.address as string) ?? "{{city}}"} onChange={(address) => patch({ address })} />
      </div>
    );
  }

  if (section.type === "statistics") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <StatListEditor
          items={(props.items as { label: string; value: string }[]) ?? []}
          onChange={(items) => patch({ items })}
        />
      </div>
    );
  }

  if (section.type === "process") {
    const items = (props.items as { title: string; description: string }[]) ?? [];
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-500">Steps</legend>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="space-y-2 rounded-md border border-slate-100 p-2">
                <TextField label="Title" value={item.title} onChange={(title) => {
                  const next = [...items];
                  next[index] = { ...item, title };
                  patch({ items: next });
                }} />
                <TextField label="Description" value={item.description} onChange={(description) => {
                  const next = [...items];
                  next[index] = { ...item, description };
                  patch({ items: next });
                }} multiline rows={2} />
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-xs font-medium text-[#4a6fd8]" onClick={() => patch({ items: [...items, { title: "", description: "" }] })}>
            + Add step
          </button>
        </fieldset>
      </div>
    );
  }

  if (section.type === "newsletter") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <TextField label="Description" value={(props.description as string) ?? ""} onChange={(description) => patch({ description })} multiline rows={2} />
        <TextField label="Button label" value={(props.buttonLabel as string) ?? "Subscribe"} onChange={(buttonLabel) => patch({ buttonLabel })} />
        <TextField label="Placeholder" value={(props.placeholder as string) ?? "you@email.com"} onChange={(placeholder) => patch({ placeholder })} />
      </div>
    );
  }

  if (section.type === "blog-posts") {
    return (
      <div className="space-y-4">
        <TextField label="Heading" value={(props.heading as string) ?? ""} onChange={(heading) => patch({ heading })} />
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Posts to show</span>
          <input
            type="number"
            min={1}
            max={12}
            className={inputClass}
            value={(props.limit as number) ?? 3}
            onChange={(e) => patch({ limit: Number(e.target.value) })}
          />
        </label>
        <p className="text-xs text-slate-500">Pulls from your Growth content module when published.</p>
      </div>
    );
  }

  if (section.type === "custom-html") {
    return (
      <TextField
        label="HTML"
        value={(props.html as string) ?? ""}
        onChange={(html) => patch({ html })}
        multiline
        rows={10}
      />
    );
  }

  if (section.type === "custom-component") {
    return (
      <div className="space-y-4">
        <TextField label="Component key" value={(props.componentKey as string) ?? ""} onChange={(componentKey) => patch({ componentKey })} />
        <TextField label="Notes" value={(props.note as string) ?? ""} onChange={(note) => patch({ note })} multiline rows={2} />
      </div>
    );
  }

  return <p className="text-sm text-slate-500">No editor for this section type.</p>;
}
