/**
 * Helpers for turning untrusted query strings into safe query values.
 *
 * The public routes previously fed `Number(req.query.limit)` straight into
 * Mongoose. That let `?limit=abc` become `NaN` - which Mongoose ignores, so the
 * endpoint returned the entire collection and reported `limit: null,
 * totalPages: null` - `?limit=100000` return an unbounded payload, and
 * `?page=-5` produce a negative `skip()` that the driver rejects with a 500.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * A positive integer page number. Anything unparseable or below 1 becomes 1.
 */
export function parsePage(value: unknown): number {
  const page = Math.floor(Number(value));
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/**
 * A page size clamped to `[1, max]`, defaulting when unparseable.
 */
export function parseLimit(
  value: unknown,
  fallback: number = DEFAULT_PAGE_SIZE,
  max: number = MAX_PAGE_SIZE
): number {
  const limit = Math.floor(Number(value));

  if (!Number.isFinite(limit) || limit < 1) {
    return Math.min(fallback, max);
  }

  return Math.min(limit, max);
}

/**
 * Page, limit and the matching skip in one call.
 */
export function parsePagination(
  query: { page?: unknown; limit?: unknown } = {},
  fallbackLimit: number = DEFAULT_PAGE_SIZE,
  maxLimit: number = MAX_PAGE_SIZE
): { page: number; limit: number; skip: number } {
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit, fallbackLimit, maxLimit);

  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Escapes a user-supplied string for safe use inside a RegExp.
 *
 * Without this, a search term containing regex metacharacters either fails to
 * match what the user typed or, with nested quantifiers, pins a CPU core.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A case-insensitive "contains" matcher built from untrusted input.
 */
export function containsMatcher(value: string): RegExp {
  return new RegExp(escapeRegex(value), "i");
}
