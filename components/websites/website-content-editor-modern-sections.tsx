"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { WebsiteImageUploadField } from "@/components/websites/website-image-upload-field";
import {
  type BlogPostFormItem,
  type StepFormItem,
  type TestimonialFormItem,
  type TransformSlideFormItem,
  type WebsiteContentFormData,
} from "@/components/websites/website-content-form-data";
import { cn } from "@/lib/utils";

const inputClass = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium text-slate-700";

type Props = {
  activeSection: string;
  formData: WebsiteContentFormData;
  setFormData: Dispatch<SetStateAction<WebsiteContentFormData>>;
  websiteId: string;
};

export function WebsiteContentEditorModernSections({
  activeSection,
  formData,
  setFormData,
  websiteId,
}: Props) {
  const updateWorkStep = (index: number, key: keyof StepFormItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      workProcess: {
        ...prev.workProcess,
        steps: prev.workProcess.steps.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addWorkStep = () => {
    setFormData((prev) => ({
      ...prev,
      workProcess: {
        ...prev.workProcess,
        steps: [...prev.workProcess.steps, { title: "", description: "" }],
      },
    }));
  };

  const removeWorkStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      workProcess: {
        ...prev.workProcess,
        steps: prev.workProcess.steps.filter((_, i) => i !== index),
      },
    }));
  };

  const updateSlide = (index: number, key: keyof TransformSlideFormItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      transformShowcase: {
        ...prev.transformShowcase,
        slides: prev.transformShowcase.slides.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addSlide = () => {
    setFormData((prev) => ({
      ...prev,
      transformShowcase: {
        ...prev.transformShowcase,
        slides: [
          ...prev.transformShowcase.slides,
          { label: "", beforeImage: "", afterImage: "", thumbnailImage: "" },
        ],
      },
    }));
  };

  const removeSlide = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      transformShowcase: {
        ...prev.transformShowcase,
        slides: prev.transformShowcase.slides.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTestimonial = (
    index: number,
    key: keyof TestimonialFormItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: prev.testimonials.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addTestimonial = () => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: [
          ...prev.testimonials.items,
          { quote: "", name: "", company: "", avatar: "" },
        ],
      },
    }));
  };

  const removeTestimonial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: prev.testimonials.items.filter((_, i) => i !== index),
      },
    }));
  };

  const updateBlogPost = (index: number, key: keyof BlogPostFormItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      homeBlog: {
        ...prev.homeBlog,
        posts: prev.homeBlog.posts.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addBlogPost = () => {
    setFormData((prev) => ({
      ...prev,
      homeBlog: {
        ...prev.homeBlog,
        posts: [...prev.homeBlog.posts, { category: "", title: "", excerpt: "", image: "" }],
      },
    }));
  };

  const removeBlogPost = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      homeBlog: {
        ...prev.homeBlog,
        posts: prev.homeBlog.posts.filter((_, i) => i !== index),
      },
    }));
  };

  const updateBenefit = (
    index: number,
    key: "title" | "description",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        benefits: prev.whyChooseUs.benefits.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addBenefit = () => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        benefits: [...prev.whyChooseUs.benefits, { title: "", description: "" }],
      },
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        benefits: prev.whyChooseUs.benefits.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <>
      {activeSection === "workProcess" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Work process</h2>
          <p className="mt-1 text-sm text-slate-500">
            Three-step process section shown below services on the homepage.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Section label
              <input
                className={inputClass}
                value={formData.workProcess.label}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    workProcess: { ...prev.workProcess, label: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.workProcess.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    workProcess: { ...prev.workProcess, heading: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Steps</h3>
            <Button type="button" variant="outline" size="sm" onClick={addWorkStep}>
              Add step
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {formData.workProcess.steps.map((step, idx) => (
              <div key={`work-step-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <label className={labelClass}>
                  Title
                  <input
                    className={inputClass}
                    value={step.title}
                    onChange={(e) => updateWorkStep(idx, "title", e.target.value)}
                  />
                </label>
                <label className={cn(labelClass, "mt-2 block")}>
                  Description
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={step.description}
                    onChange={(e) => updateWorkStep(idx, "description", e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => removeWorkStep(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "whyChooseUs" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Quality You Trust</h2>
          <p className="mt-1 text-sm text-slate-500">
            &ldquo;Why Our Experts Stand Out&rdquo; — two tall photos with the quality seal
            between them.
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Section label (small text above heading)
              <input
                className={inputClass}
                value={formData.whyChooseUs.label}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    whyChooseUs: { ...prev.whyChooseUs, label: e.target.value },
                  }))
                }
                placeholder="Quality You Trust"
              />
            </label>
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.whyChooseUs.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    whyChooseUs: { ...prev.whyChooseUs, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Body
              <textarea
                className={inputClass}
                rows={4}
                value={formData.whyChooseUs.body}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    whyChooseUs: { ...prev.whyChooseUs, body: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Badge text (center seal ring)
              <input
                className={inputClass}
                value={formData.whyChooseUs.badgeText}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    whyChooseUs: { ...prev.whyChooseUs, badgeText: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <WebsiteImageUploadField
              label="Left photo"
              websiteId={websiteId}
              value={formData.whyChooseUs.image}
              alt={formData.whyChooseUs.imageAlt}
              onValueChange={(image) =>
                setFormData((prev) => ({
                  ...prev,
                  whyChooseUs: { ...prev.whyChooseUs, image },
                }))
              }
              onAltChange={(imageAlt) =>
                setFormData((prev) => ({
                  ...prev,
                  whyChooseUs: { ...prev.whyChooseUs, imageAlt },
                }))
              }
            />
            <WebsiteImageUploadField
              label="Right photo"
              websiteId={websiteId}
              value={formData.whyChooseUs.imageSecondary}
              alt={formData.whyChooseUs.imageSecondaryAlt}
              onValueChange={(imageSecondary) =>
                setFormData((prev) => ({
                  ...prev,
                  whyChooseUs: { ...prev.whyChooseUs, imageSecondary },
                }))
              }
              onAltChange={(imageSecondaryAlt) =>
                setFormData((prev) => ({
                  ...prev,
                  whyChooseUs: { ...prev.whyChooseUs, imageSecondaryAlt },
                }))
              }
            />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Benefit bullets</h3>
            <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
              Add benefit
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {formData.whyChooseUs.benefits.map((benefit, idx) => (
              <div key={`why-benefit-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <label className={labelClass}>
                  Benefit {idx + 1}
                  <input
                    className={inputClass}
                    value={benefit.title}
                    onChange={(e) => updateBenefit(idx, "title", e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => removeBenefit(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "featureBanner" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Feature banner</h2>
          <p className="mt-1 text-sm text-slate-500">Full-width image band between sections.</p>
          <div className="mt-4">
            <WebsiteImageUploadField
              label="Banner image"
              websiteId={websiteId}
              value={formData.featureBanner.image}
              alt={formData.featureBanner.imageAlt}
              onValueChange={(image) =>
                setFormData((prev) => ({
                  ...prev,
                  featureBanner: { ...prev.featureBanner, image },
                }))
              }
              onAltChange={(imageAlt) =>
                setFormData((prev) => ({
                  ...prev,
                  featureBanner: { ...prev.featureBanner, imageAlt },
                }))
              }
            />
          </div>
        </>
      ) : null}

      {activeSection === "transform" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Transform showcase</h2>
          <p className="mt-1 text-sm text-slate-500">
            Before/after slider with up to four project thumbnails.
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Section label
              <input
                className={inputClass}
                value={formData.transformShowcase.label}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transformShowcase: { ...prev.transformShowcase, label: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.transformShowcase.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transformShowcase: { ...prev.transformShowcase, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Body
              <textarea
                className={inputClass}
                rows={3}
                value={formData.transformShowcase.body}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transformShowcase: { ...prev.transformShowcase, body: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Feature bullets (one per line)
              <textarea
                className={inputClass}
                rows={3}
                value={formData.transformShowcase.features}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transformShowcase: { ...prev.transformShowcase, features: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Project slides</h3>
            <Button type="button" variant="outline" size="sm" onClick={addSlide}>
              Add slide
            </Button>
          </div>
          <div className="mt-3 space-y-4">
            {formData.transformShowcase.slides.map((slide, idx) => (
              <div key={`slide-${idx}`} className="rounded-xl border border-slate-200 p-4">
                <label className={labelClass}>
                  Label
                  <input
                    className={inputClass}
                    value={slide.label}
                    onChange={(e) => updateSlide(idx, "label", e.target.value)}
                  />
                </label>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <WebsiteImageUploadField
                    label="Before image"
                    websiteId={websiteId}
                    value={slide.beforeImage}
                    alt={`${slide.label} before`}
                    hideAlt
                    onValueChange={(beforeImage) => updateSlide(idx, "beforeImage", beforeImage)}
                    onAltChange={() => {}}
                  />
                  <WebsiteImageUploadField
                    label="After image"
                    websiteId={websiteId}
                    value={slide.afterImage}
                    alt={`${slide.label} after`}
                    hideAlt
                    onValueChange={(afterImage) => updateSlide(idx, "afterImage", afterImage)}
                    onAltChange={() => {}}
                  />
                  <WebsiteImageUploadField
                    label="Thumbnail"
                    websiteId={websiteId}
                    value={slide.thumbnailImage}
                    alt={slide.label}
                    hideAlt
                    onValueChange={(thumbnailImage) =>
                      updateSlide(idx, "thumbnailImage", thumbnailImage)
                    }
                    onAltChange={() => {}}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => removeSlide(idx)}
                >
                  Remove slide
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "testimonials" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Testimonials</h2>
          <p className="mt-1 text-sm text-slate-500">Client reviews with avatar photos.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Section label
              <input
                className={inputClass}
                value={formData.testimonials.label}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, label: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.testimonials.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, heading: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Reviews</h3>
            <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
              Add review
            </Button>
          </div>
          <div className="mt-3 space-y-4">
            {formData.testimonials.items.map((item, idx) => (
              <div key={`testimonial-${idx}`} className="rounded-xl border border-slate-200 p-4">
                <label className={labelClass}>
                  Quote
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={item.quote}
                    onChange={(e) => updateTestimonial(idx, "quote", e.target.value)}
                  />
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Name
                    <input
                      className={inputClass}
                      value={item.name}
                      onChange={(e) => updateTestimonial(idx, "name", e.target.value)}
                    />
                  </label>
                  <label className={labelClass}>
                    Company / role
                    <input
                      className={inputClass}
                      value={item.company}
                      onChange={(e) => updateTestimonial(idx, "company", e.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <WebsiteImageUploadField
                    label="Avatar photo"
                    websiteId={websiteId}
                    value={item.avatar}
                    alt={item.name}
                    hideAlt
                    onValueChange={(avatar) => updateTestimonial(idx, "avatar", avatar)}
                    onAltChange={() => {}}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => removeTestimonial(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "craftsmanship" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Craftsmanship</h2>
          <p className="mt-1 text-sm text-slate-500">
            Image collage section with phone call-to-action.
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Section label
              <input
                className={inputClass}
                value={formData.craftsmanship.label}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    craftsmanship: { ...prev.craftsmanship, label: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.craftsmanship.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    craftsmanship: { ...prev.craftsmanship, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Body
              <textarea
                className={inputClass}
                rows={4}
                value={formData.craftsmanship.body}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    craftsmanship: { ...prev.craftsmanship, body: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Feature bullets (one per line)
              <textarea
                className={inputClass}
                rows={3}
                value={formData.craftsmanship.features}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    craftsmanship: { ...prev.craftsmanship, features: e.target.value },
                  }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Phone label
                <input
                  className={inputClass}
                  value={formData.craftsmanship.phoneLabel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      craftsmanship: { ...prev.craftsmanship, phoneLabel: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Phone number
                <input
                  className={inputClass}
                  value={formData.craftsmanship.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      craftsmanship: { ...prev.craftsmanship, phone: e.target.value },
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <WebsiteImageUploadField
              label="Large left photo"
              websiteId={websiteId}
              value={formData.craftsmanship.image}
              alt={formData.craftsmanship.imageAlt}
              onValueChange={(image) =>
                setFormData((prev) => ({
                  ...prev,
                  craftsmanship: { ...prev.craftsmanship, image },
                }))
              }
              onAltChange={(imageAlt) =>
                setFormData((prev) => ({
                  ...prev,
                  craftsmanship: { ...prev.craftsmanship, imageAlt },
                }))
              }
            />
            <WebsiteImageUploadField
              label="Top-right photo"
              websiteId={websiteId}
              value={formData.craftsmanship.imageSecondary}
              alt="Craftsmanship detail"
              hideAlt
              onValueChange={(imageSecondary) =>
                setFormData((prev) => ({
                  ...prev,
                  craftsmanship: { ...prev.craftsmanship, imageSecondary },
                }))
              }
              onAltChange={() => {}}
            />
            <WebsiteImageUploadField
              label="Bottom-right photo"
              websiteId={websiteId}
              value={formData.craftsmanship.imageTertiary}
              alt="Craftsmanship detail"
              hideAlt
              onValueChange={(imageTertiary) =>
                setFormData((prev) => ({
                  ...prev,
                  craftsmanship: { ...prev.craftsmanship, imageTertiary },
                }))
              }
              onAltChange={() => {}}
            />
          </div>
        </>
      ) : null}

      {activeSection === "blog" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Blog section</h2>
          <p className="mt-1 text-sm text-slate-500">
            Homepage blog preview cards and footer call bar text.
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Section label
              <input
                className={inputClass}
                value={formData.homeBlog.label}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    homeBlog: { ...prev.homeBlog, label: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.homeBlog.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    homeBlog: { ...prev.homeBlog, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Body
              <textarea
                className={inputClass}
                rows={3}
                value={formData.homeBlog.body}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    homeBlog: { ...prev.homeBlog, body: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Explore button label
              <input
                className={inputClass}
                value={formData.homeBlog.ctaLabel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    homeBlog: { ...prev.homeBlog, ctaLabel: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Blog cards</h3>
            <Button type="button" variant="outline" size="sm" onClick={addBlogPost}>
              Add post
            </Button>
          </div>
          <div className="mt-3 space-y-4">
            {formData.homeBlog.posts.map((post, idx) => (
              <div key={`blog-${idx}`} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Category
                    <input
                      className={inputClass}
                      value={post.category}
                      onChange={(e) => updateBlogPost(idx, "category", e.target.value)}
                    />
                  </label>
                  <label className={labelClass}>
                    Title
                    <input
                      className={inputClass}
                      value={post.title}
                      onChange={(e) => updateBlogPost(idx, "title", e.target.value)}
                    />
                  </label>
                </div>
                <label className={cn(labelClass, "mt-3 block")}>
                  Excerpt
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={post.excerpt}
                    onChange={(e) => updateBlogPost(idx, "excerpt", e.target.value)}
                  />
                </label>
                <div className="mt-3">
                  <WebsiteImageUploadField
                    label="Card image"
                    websiteId={websiteId}
                    value={post.image}
                    alt={post.title}
                    hideAlt
                    onValueChange={(image) => updateBlogPost(idx, "image", image)}
                    onAltChange={() => {}}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => removeBlogPost(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
