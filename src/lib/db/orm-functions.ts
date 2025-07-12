// Mock ORM functions for development
// In a real application, these would come from drizzle-orm

export const eq = (field: unknown, value: unknown) => ({ field, value, op: 'eq' });
export const and = (...conditions: unknown[]) => ({ conditions, op: 'and' });
export const or = (...conditions: unknown[]) => ({ conditions, op: 'or' });
export const gte = (field: unknown, value: unknown) => ({ field, value, op: 'gte' });
export const lte = (field: unknown, value: unknown) => ({ field, value, op: 'lte' });
export const like = (field: unknown, value: unknown) => ({ field, value, op: 'like' });
export const desc = (field: unknown) => ({ field, order: 'desc' });
export const count = (field?: unknown) => ({ field, fn: 'count' });
export const sum = (field: unknown) => ({ field, fn: 'sum' });
export const avg = (field: unknown) => ({ field, fn: 'avg' });
export const sql = {
  raw: (template: TemplateStringsArray, ...values: unknown[]) => ({ template, values, type: 'raw' })
};