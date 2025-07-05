import { describe, it, expect } from 'vitest';

describe('Basic Test Setup', () => {
  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect(true).toBeTruthy();
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });

  it('should work with arrays and objects', () => {
    const arr = [1, 2, 3];
    const obj = { name: 'test', value: 42 };

    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
    expect(obj).toHaveProperty('name', 'test');
    expect(obj).toEqual({ name: 'test', value: 42 });
  });
});