/**
 * Standard Pagination Utilities for Plexi-ERP
 * Supports both cursor-based and offset-based pagination with safe defaults.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Parses URL search params or an input object into safe database query pagination limits.
 * Default limit is 50, maximum safe limit is 500 to prevent DOS / memory bloat.
 */
export function parsePaginationParams(
  params: URLSearchParams | Record<string, string | number | undefined | null>,
  options: { defaultLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number; skip: number; take: number; isPaginated: boolean } {
  const { defaultLimit = 50, maxLimit = 500 } = options;

  let pageRaw: string | number | undefined | null;
  let limitRaw: string | number | undefined | null;

  if (params instanceof URLSearchParams) {
    pageRaw = params.get("page");
    limitRaw = params.get("limit") || params.get("take");
  } else {
    pageRaw = params.page;
    limitRaw = params.limit ?? params.take;
  }

  const isPaginated = Boolean(pageRaw !== undefined && pageRaw !== null) || Boolean(limitRaw !== undefined && limitRaw !== null);

  const page = Math.max(1, parseInt(String(pageRaw || "1"), 10) || 1);
  const requestedLimit = parseInt(String(limitRaw || defaultLimit), 10) || defaultLimit;
  const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
    isPaginated,
  };
}

/**
 * Computes standard pagination metadata from total count and query parameters.
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / Math.max(1, limit)) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
