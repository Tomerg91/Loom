// Mock database implementation for development
// In a real application, this would be a proper database connection

interface MockDatabase {
  select: (fields: any) => MockQueryBuilder;
  update: (table: any) => MockUpdateBuilder;
  delete: (table: any) => MockDeleteBuilder;
}

interface MockQueryBuilder {
  from: (table: any) => MockQueryBuilder;
  where: (condition: any) => MockQueryBuilder;
  leftJoin: (table: any, condition: any) => MockQueryBuilder;
  innerJoin: (table: any, condition: any) => MockQueryBuilder;
  groupBy: (...fields: any[]) => MockQueryBuilder;
  orderBy: (...fields: any[]) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  offset: (count: number) => MockQueryBuilder;
  execute: () => Promise<any[]>;
}

interface MockUpdateBuilder {
  set: (data: any) => MockUpdateBuilder;
  where: (condition: any) => MockUpdateBuilder;
  execute: () => Promise<void>;
}

interface MockDeleteBuilder {
  where: (condition: any) => MockDeleteBuilder;
  execute: () => Promise<void>;
}

class MockDB implements MockDatabase {
  select(fields: any): MockQueryBuilder {
    return new MockQueryBuilderImpl();
  }

  update(table: any): MockUpdateBuilder {
    return new MockUpdateBuilderImpl();
  }

  delete(table: any): MockDeleteBuilder {
    return new MockDeleteBuilderImpl();
  }
}

class MockQueryBuilderImpl implements MockQueryBuilder {
  from(table: any): MockQueryBuilder { return this; }
  where(condition: any): MockQueryBuilder { return this; }
  leftJoin(table: any, condition: any): MockQueryBuilder { return this; }
  innerJoin(table: any, condition: any): MockQueryBuilder { return this; }
  groupBy(...fields: any[]): MockQueryBuilder { return this; }
  orderBy(...fields: any[]): MockQueryBuilder { return this; }
  limit(count: number): MockQueryBuilder { return this; }
  offset(count: number): MockQueryBuilder { return this; }
  
  async execute(): Promise<any[]> {
    // Return empty array for mock queries
    return [];
  }
}

class MockUpdateBuilderImpl implements MockUpdateBuilder {
  set(data: any): MockUpdateBuilder { return this; }
  where(condition: any): MockUpdateBuilder { return this; }
  
  async execute(): Promise<void> {
    // Mock update
  }
}

class MockDeleteBuilderImpl implements MockDeleteBuilder {
  where(condition: any): MockDeleteBuilder { return this; }
  
  async execute(): Promise<void> {
    // Mock delete
  }
}

export const db = new MockDB();