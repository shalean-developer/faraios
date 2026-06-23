export function isMissingSortOrderColumn(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes("sort_order") && message.includes("does not exist");
}

export function withoutSortOrder<T extends Record<string, unknown>>(row: T): Omit<T, "sort_order"> {
  const { sort_order: _sortOrder, ...rest } = row;
  return rest;
}
