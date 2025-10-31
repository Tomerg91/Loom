import { describe, it, expect } from 'vitest';
import {
  transformClientData,
  transformClientList,
} from '@/lib/transformers/client-transformer';

describe('client-transformer', () => {
  describe('transformClientData', () => {
    it('should transform camelCase API response', () => {
      const apiResponse = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
      };

      const result = transformClientData(apiResponse);

      expect(result).toEqual({
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
      });
    });

    it('should transform snake_case API response', () => {
      const apiResponse = {
        id: '123',
        first_name: 'Jane',
        last_name: 'Smith',
        email_address: 'jane@example.com',
        phone_number: '555-5678',
      };

      const result = transformClientData(apiResponse);

      expect(result).toEqual({
        id: '123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        first_name: 'Jane',
        last_name: 'Smith',
        email_address: 'jane@example.com',
        phone_number: '555-5678',
      });
    });

    it('should handle missing fields gracefully', () => {
      const apiResponse = {
        id: '123',
      };

      const result = transformClientData(apiResponse);

      expect(result).toEqual({
        id: '123',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
    });
  });

  describe('transformClientList', () => {
    it('should transform array of API responses', () => {
      const apiResponses = [
        {
          id: '123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
        },
        {
          id: '456',
          first_name: 'Jane',
          last_name: 'Smith',
          email_address: 'jane@example.com',
          phone_number: '555-5678',
        },
      ];

      const result = transformClientList(apiResponses);

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe('John');
      expect(result[1].firstName).toBe('Jane');
    });
  });
});
