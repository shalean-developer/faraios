export type AdminGlobalSearchCategory =
  | "navigation"
  | "business"
  | "user"
  | "ticket"
  | "domain";

export type AdminGlobalSearchResult = {
  id: string;
  category: AdminGlobalSearchCategory;
  label: string;
  description?: string;
  href: string;
};

export type AdminGlobalSearchResponse = {
  query: string;
  results: AdminGlobalSearchResult[];
};
