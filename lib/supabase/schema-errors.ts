/** True when a Supabase/PostgREST error indicates a table or column is not migrated yet. */
export function isSupabaseSchemaMissingError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("Could not find the table")
  );
}

/** True when Supabase schema for the booking form builder has not been migrated yet. */
export function isBookingBuilderSchemaMissing(error: {
  code?: string;
  message?: string;
} | null): boolean {
  return isSupabaseSchemaMissingError(error);
}
