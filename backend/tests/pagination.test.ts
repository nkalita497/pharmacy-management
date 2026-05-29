import { parsePagination, paginatedResponse } from '../src/utils/pagination';
import { Request } from 'express';

function mockReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

describe('Pagination utils', () => {
  it('parses page and limit with defaults', () => {
    const p = parsePagination(mockReq({}), 'medicines');
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.offset).toBe(0);
  });

  it('caps limit at 100', () => {
    const p = parsePagination(mockReq({ limit: '500' }), 'medicines');
    expect(p.limit).toBe(100);
  });

  it('whitelists sort column', () => {
    const p = parsePagination(mockReq({ sort: 'DROP TABLE' }), 'medicines');
    expect(p.sort).toBe('id');
  });

  it('builds paginated response meta', () => {
    const params = parsePagination(mockReq({ page: '2', limit: '10' }), 'medicines');
    const result = paginatedResponse([{ id: 1 }], 25, params);
    expect(result.meta.totalPages).toBe(3);
    expect(result.data).toHaveLength(1);
  });
});
