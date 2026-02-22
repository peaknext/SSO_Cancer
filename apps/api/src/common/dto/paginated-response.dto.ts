export class PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponseDto<T> {
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
