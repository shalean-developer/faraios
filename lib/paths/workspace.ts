/** Platform admin workspace URL prefix: /admin/workspace/{slug}/dashboard */
export function platformWorkspaceRoot(slug: string): string {
  return `/admin/workspace/${encodeURIComponent(slug)}/dashboard`;
}

export function platformWorkspacePath(slug: string, suffix = ""): string {
  const base = platformWorkspaceRoot(slug);
  if (!suffix) return base;
  const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${base}${normalized}`;
}

/** Convert a standard business dashboard path to a platform workspace path. */
export function toPlatformWorkspacePath(slug: string, companyPath: string): string {
  const encoded = encodeURIComponent(slug);
  const standardPrefix = `/${encoded}/dashboard`;
  if (companyPath === standardPrefix || companyPath.startsWith(`${standardPrefix}/`)) {
    const suffix = companyPath.slice(standardPrefix.length);
    return platformWorkspaceRoot(slug) + suffix;
  }
  if (companyPath.startsWith(`/admin/workspace/${encoded}/dashboard`)) {
    return companyPath;
  }
  return companyPath;
}

export function isPlatformWorkspacePath(pathname: string, slug: string): boolean {
  const prefix = `/admin/workspace/${encodeURIComponent(slug)}/dashboard`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function dashboardBaseFromPathname(
  slug: string,
  pathname: string
): string {
  if (isPlatformWorkspacePath(pathname, slug)) {
    return platformWorkspaceRoot(slug);
  }
  return `/${encodeURIComponent(slug)}/dashboard`;
}
