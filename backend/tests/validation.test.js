import { describe, expect, test } from 'vitest';
import { validateCustomerInput } from '../src/validation.js';

describe('customer validation', () => {
  test('rejects missing customer name', () => {
    expect(() => validateCustomerInput({ website: 'https://example.com' })).toThrow(/name/i);
  });

  test('accepts a minimal valid customer', () => {
    expect(validateCustomerInput({ name: 'Acme' })).toEqual({
      name: 'Acme',
      industry: null,
      website: null,
      notes: null
    });
  });
});
