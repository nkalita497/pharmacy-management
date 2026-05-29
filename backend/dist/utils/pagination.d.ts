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
declare const SORT_WHITELIST: Record<string, string[]>;
export declare function parsePagination(req: Request, entity: keyof typeof SORT_WHITELIST): PaginationParams;
export declare function paginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T>;
export {};
//# sourceMappingURL=pagination.d.ts.map