// Mock database implementation for development
// In a real application, this would be a proper database connection

interface MockDatabase {
  select: (fields: string[] | string) => MockQueryBuilder;
  update: (table: string) => MockUpdateBuilder;
  delete: (table: string) => MockDeleteBuilder;
}

interface MockQueryBuilder {
  from: (table: string) => MockQueryBuilder;
  where: (condition: Record<string, unknown>) => MockQueryBuilder;
  leftJoin: (table: string, condition: Record<string, unknown>) => MockQueryBuilder;
  innerJoin: (table: string, condition: Record<string, unknown>) => MockQueryBuilder;
  groupBy: (...fields: string[]) => MockQueryBuilder;
  orderBy: (...fields: string[]) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  offset: (count: number) => MockQueryBuilder;
  execute: () => Promise<unknown[]>;
}

interface MockUpdateBuilder {
  set: (data: Record<string, unknown>) => MockUpdateBuilder;
  where: (condition: Record<string, unknown>) => MockUpdateBuilder;
  execute: () => Promise<void>;
}

interface MockDeleteBuilder {
  where: (condition: Record<string, unknown>) => MockDeleteBuilder;
  execute: () => Promise<void>;
}

class MockDB implements MockDatabase {
  select(_fields: string[] | string): MockQueryBuilder {
    return new MockQueryBuilderImpl();
  }

  update(_table: string): MockUpdateBuilder {
    return new MockUpdateBuilderImpl();
  }

  delete(_table: string): MockDeleteBuilder {
    return new MockDeleteBuilderImpl();
  }
}

class MockQueryBuilderImpl implements MockQueryBuilder {
  from(_table: string): MockQueryBuilder { return this; }
  where(_condition: Record<string, unknown>): MockQueryBuilder { return this; }
  leftJoin(_table: string, _condition: Record<string, unknown>): MockQueryBuilder { return this; }
  innerJoin(_table: string, _condition: Record<string, unknown>): MockQueryBuilder { return this; }
  groupBy(..._fields: string[]): MockQueryBuilder { return this; }
  orderBy(..._fields: string[]): MockQueryBuilder { return this; }
  limit(_count: number): MockQueryBuilder { return this; }
  offset(_count: number): MockQueryBuilder { return this; }
  
  async execute(): Promise<unknown[]> {
    // Return empty array for mock queries
    return [];
  }
}

class MockUpdateBuilderImpl implements MockUpdateBuilder {
  set(_data: Record<string, unknown>): MockUpdateBuilder { return this; }
  where(_condition: Record<string, unknown>): MockUpdateBuilder { return this; }
  
  async execute(): Promise<void> {
    // Mock update
  }
}

class MockDeleteBuilderImpl implements MockDeleteBuilder {
  where(_condition: Record<string, unknown>): MockDeleteBuilder { return this; }
  
  async execute(): Promise<void> {
    // Mock delete
  }
}

export const db = new MockDB();