export type BlogCategory = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BlogTag = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type BlogPostWithTaxonomy = {
  tagIds: string[];
  blogCategoryId: string | null;
};
