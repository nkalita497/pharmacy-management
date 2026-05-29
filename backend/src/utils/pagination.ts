import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  sort: string;
  order: 'ASC' | 'DESC';
  q: string;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sort: string;
    order: string;
    q: string;
  };
}

const SORT_WHITELIST: Record<string, string[]> = {
  medicines: ['id', 'name', 'price', 'stock', 'expiry_date', 'category'],
  patients: ['id', 'first_name', 'last_name', 'pesel'],
  suppliers: ['id', 'name'],
  prescriptions: ['id', 'status', 'prescription_date'],
  sales: ['id', 'sale_date', 'total_price', 'quantity']
};

export function parsePagination(req: Request, entity: keyof typeof SORT_WHITELIST): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const order = String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const allowed = SORT_WHITELIST[entity] || ['id'];
  const sortRaw = String(req.query.sort || 'id');
  const sort = allowed.includes(sortRaw) ? sortRaw : 'id';
  const q = String(req.query.q || '').trim();
  return { page, limit, sort, order, q, offset: (page - 1) * limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
      sort: params.sort,
      order: params.order,
      q: params.q
    }
  };
}
