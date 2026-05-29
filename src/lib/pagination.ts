/**
 * Runtime pagination helpers for SSR listing routes (categoría, autor, tag, wbc-2026).
 *
 * Replaces Astro's build-time `paginate()` (which only works inside
 * `getStaticPaths`). Produces a `page` object whose shape matches the subset of
 * Astro's `Page` used by the listing templates, so the existing markup is
 * unchanged.
 *
 * URL convention mirrors Astro's `[...page]` paginate output (and the sitemap):
 *   page 1 → base path (no suffix); page N → `${base}/${N}`.
 */

export interface PageLike<T> {
  data: T[];
  currentPage: number;
  lastPage: number;
  total: number;
  size: number;
  start: number;
  end: number;
  url: {
    current: string;
    prev: string | undefined;
    next: string | undefined;
    first: string;
    last: string;
  };
}

/**
 * Parse the `[...page]` route param into a 1-based page number.
 * Returns `null` for inputs that should 404: non-numeric, leading zero, or an
 * explicit `/1` (page 1 is only valid as the bare base path, matching the old
 * SSG routes and avoiding duplicate-content URLs).
 */
export function parsePageParam(pageParam: string | undefined): number | null {
  if (pageParam === undefined || pageParam === '') return 1;
  if (!/^[1-9]\d*$/.test(pageParam)) return null;
  const n = Number(pageParam);
  return n === 1 ? null : n;
}

/**
 * Build an Astro-`Page`-compatible object from an already-fetched slice.
 * `basePath` is the listing root with no trailing slash and no page suffix,
 * e.g. `/categoria/mlb`.
 */
export function buildPage<T>(
  data: T[],
  total: number,
  currentPage: number,
  pageSize: number,
  basePath: string,
): PageLike<T> {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const urlForPage = (p: number) => (p <= 1 ? basePath : `${basePath}/${p}`);
  const start = (currentPage - 1) * pageSize;
  return {
    data,
    currentPage,
    lastPage,
    total,
    size: pageSize,
    start,
    end: start + data.length - 1,
    url: {
      current: urlForPage(currentPage),
      prev: currentPage > 1 ? urlForPage(currentPage - 1) : undefined,
      next: currentPage < lastPage ? urlForPage(currentPage + 1) : undefined,
      first: urlForPage(1),
      last: urlForPage(lastPage),
    },
  };
}
