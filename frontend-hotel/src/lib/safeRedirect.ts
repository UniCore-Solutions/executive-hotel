/**
 * Whether `path` is safe to redirect to internally after an OAuth sign-in —
 * a relative, same-app path only. Used both when constructing the `redirect`
 * param sent to the backend's OAuth start endpoint and when consuming it
 * back on the callback page, since neither hop should trust the other
 * blindly (defense in depth against an open redirect).
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('\\') || path.includes(':')) return false;
  return true;
}
