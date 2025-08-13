// Supabase database implementation
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

interface DatabaseClient {
  select: (fields: string[] | string) => QueryBuilder;
  update: (table: string) => UpdateBuilder;
  delete: (table: string) => DeleteBuilder;
  insert: (table: string) => InsertBuilder;
}

interface QueryBuilder {
  from: (table: string) => QueryBuilder;
  where: (condition: Record<string, unknown>) => QueryBuilder;
  leftJoin: (table: string, condition: Record<string, unknown>) => QueryBuilder;
  innerJoin: (table: string, condition: Record<string, unknown>) => QueryBuilder;
  groupBy: (...fields: string[]) => QueryBuilder;
  orderBy: (...fields: string[]) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  offset: (count: number) => QueryBuilder;
  execute: () => Promise<unknown[]>;
  single: () => Promise<unknown | null>;
}

interface UpdateBuilder {
  set: (data: Record<string, unknown>) => UpdateBuilder;
  where: (condition: Record<string, unknown>) => UpdateBuilder;
  execute: () => Promise<void>;
  returning: (fields?: string) => UpdateBuilder;
}

interface DeleteBuilder {
  where: (condition: Record<string, unknown>) => DeleteBuilder;
  execute: () => Promise<void>;
  returning: (fields?: string) => DeleteBuilder;
}

interface InsertBuilder {
  values: (data: Record<string, unknown> | Record<string, unknown>[]) => InsertBuilder;
  execute: () => Promise<unknown>;
  returning: (fields?: string) => InsertBuilder;
}

class SupabaseDB implements DatabaseClient {
  private supabase: SupabaseClient<Database> | null = null;

  private async getClient(): Promise<SupabaseClient<Database>> {
    if (!this.supabase) {
      this.supabase = await createServerClient();
    }
    return this.supabase;
  }

  select(fields: string[] | string): QueryBuilder {
    return new SupabaseQueryBuilder(this.getClient(), fields);
  }

  update(table: string): UpdateBuilder {
    return new SupabaseUpdateBuilder(this.getClient(), table);
  }

  delete(table: string): DeleteBuilder {
    return new SupabaseDeleteBuilder(this.getClient(), table);
  }

  insert(table: string): InsertBuilder {
    return new SupabaseInsertBuilder(this.getClient(), table);
  }
}

class SupabaseQueryBuilder implements QueryBuilder {
  private client: Promise<SupabaseClient<Database>>;
  private fields: string;
  private tableName: string = '';
  private conditions: Array<{ field: string; value: unknown }> = [];
  private joins: Array<{ type: 'left' | 'inner'; table: string; condition: Record<string, unknown> }> = [];
  private groupByFields: string[] = [];
  private orderByFields: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;

  constructor(client: Promise<SupabaseClient<Database>>, fields: string[] | string) {
    this.client = client;
    this.fields = Array.isArray(fields) ? fields.join(', ') : fields;
  }

  from(table: string): QueryBuilder {
    this.tableName = table;
    return this;
  }

  where(condition: Record<string, unknown>): QueryBuilder {
    Object.entries(condition).forEach(([field, value]) => {
      this.conditions.push({ field, value });
    });
    return this;
  }

  leftJoin(table: string, condition: Record<string, unknown>): QueryBuilder {
    this.joins.push({ type: 'left', table, condition });
    return this;
  }

  innerJoin(table: string, condition: Record<string, unknown>): QueryBuilder {
    this.joins.push({ type: 'inner', table, condition });
    return this;
  }

  groupBy(...fields: string[]): QueryBuilder {
    this.groupByFields.push(...fields);
    return this;
  }

  orderBy(...fields: string[]): QueryBuilder {
    this.orderByFields.push(...fields);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetCount = count;
    return this;
  }

  async execute(): Promise<unknown[]> {
    try {
      const supabase = await this.client;
      let query = supabase.from(this.tableName as any).select(this.fields);

      // Apply conditions
      this.conditions.forEach(({ field, value }) => {
        query = query.eq(field as any, value);
      });

      // Apply ordering
      if (this.orderByFields.length > 0) {
        this.orderByFields.forEach(field => {
          const [fieldName, direction] = field.split(' ');
          query = query.order(fieldName as any, { 
            ascending: direction?.toLowerCase() !== 'desc' 
          });
        });
      }

      // Apply limit and offset
      if (this.limitCount !== undefined) {
        const range = {
          from: this.offsetCount || 0,
          to: (this.offsetCount || 0) + this.limitCount - 1
        };
        query = query.range(range.from, range.to);
      }

      const { data, error } = await query;

      if (error) {
        const dbError = new Error(error.message) as DatabaseError;
        dbError.code = error.code;
        dbError.details = error.details;
        dbError.hint = error.hint;
        throw dbError;
      }

      return data || [];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async single(): Promise<unknown | null> {
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }
}

class SupabaseUpdateBuilder implements UpdateBuilder {
  private client: Promise<SupabaseClient<Database>>;
  private tableName: string;
  private updateData: Record<string, unknown> = {};
  private conditions: Array<{ field: string; value: unknown }> = [];
  private returningFields?: string;

  constructor(client: Promise<SupabaseClient<Database>>, table: string) {
    this.client = client;
    this.tableName = table;
  }

  set(data: Record<string, unknown>): UpdateBuilder {
    this.updateData = { ...this.updateData, ...data };
    return this;
  }

  where(condition: Record<string, unknown>): UpdateBuilder {
    Object.entries(condition).forEach(([field, value]) => {
      this.conditions.push({ field, value });
    });
    return this;
  }

  returning(fields: string = '*'): UpdateBuilder {
    this.returningFields = fields;
    return this;
  }

  async execute(): Promise<void> {
    try {
      const supabase = await this.client;
      let query = supabase.from(this.tableName as any).update(this.updateData);

      // Apply conditions
      this.conditions.forEach(({ field, value }) => {
        query = query.eq(field as any, value);
      });

      if (this.returningFields) {
        query = query.select(this.returningFields);
      }

      const { error } = await query;

      if (error) {
        const dbError = new Error(error.message) as DatabaseError;
        dbError.code = error.code;
        dbError.details = error.details;
        dbError.hint = error.hint;
        throw dbError;
      }
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }
}

class SupabaseDeleteBuilder implements DeleteBuilder {
  private client: Promise<SupabaseClient<Database>>;
  private tableName: string;
  private conditions: Array<{ field: string; value: unknown }> = [];
  private returningFields?: string;

  constructor(client: Promise<SupabaseClient<Database>>, table: string) {
    this.client = client;
    this.tableName = table;
  }

  where(condition: Record<string, unknown>): DeleteBuilder {
    Object.entries(condition).forEach(([field, value]) => {
      this.conditions.push({ field, value });
    });
    return this;
  }

  returning(fields: string = '*'): DeleteBuilder {
    this.returningFields = fields;
    return this;
  }

  async execute(): Promise<void> {
    try {
      const supabase = await this.client;
      let query = supabase.from(this.tableName as any).delete();

      // Apply conditions
      this.conditions.forEach(({ field, value }) => {
        query = query.eq(field as any, value);
      });

      if (this.returningFields) {
        query = query.select(this.returningFields);
      }

      const { error } = await query;

      if (error) {
        const dbError = new Error(error.message) as DatabaseError;
        dbError.code = error.code;
        dbError.details = error.details;
        dbError.hint = error.hint;
        throw dbError;
      }
    } catch (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  }
}

class SupabaseInsertBuilder implements InsertBuilder {
  private client: Promise<SupabaseClient<Database>>;
  private tableName: string;
  private insertData: Record<string, unknown> | Record<string, unknown>[] = {};
  private returningFields?: string;

  constructor(client: Promise<SupabaseClient<Database>>, table: string) {
    this.client = client;
    this.tableName = table;
  }

  values(data: Record<string, unknown> | Record<string, unknown>[]): InsertBuilder {
    this.insertData = data;
    return this;
  }

  returning(fields: string = '*'): InsertBuilder {
    this.returningFields = fields;
    return this;
  }

  async execute(): Promise<unknown> {
    try {
      const supabase = await this.client;
      let query = supabase.from(this.tableName as any).insert(this.insertData as any);

      if (this.returningFields) {
        query = query.select(this.returningFields);
      }

      const { data, error } = await query;

      if (error) {
        const dbError = new Error(error.message) as DatabaseError;
        dbError.code = error.code;
        dbError.details = error.details;
        dbError.hint = error.hint;
        throw dbError;
      }

      return data;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }
}

export const db = new SupabaseDB();

// Direct Supabase client access for complex queries
export async function getSupabaseClient(): Promise<SupabaseClient<Database>> {
  return createServerClient();
}