"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.paginatedResponse = paginatedResponse;
const SORT_WHITELIST = {
    medicines: ['id', 'name', 'price', 'stock', 'expiry_date', 'category'],
    patients: ['id', 'first_name', 'last_name', 'pesel'],
    suppliers: ['id', 'name'],
    prescriptions: ['id', 'status', 'prescription_date'],
    sales: ['id', 'sale_date', 'total_price', 'quantity']
};
function parsePagination(req, entity) {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const order = String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const allowed = SORT_WHITELIST[entity] || ['id'];
    const sortRaw = String(req.query.sort || 'id');
    const sort = allowed.includes(sortRaw) ? sortRaw : 'id';
    const q = String(req.query.q || '').trim();
    return { page, limit, sort, order, q, offset: (page - 1) * limit };
}
function paginatedResponse(data, total, params) {
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
//# sourceMappingURL=pagination.js.map