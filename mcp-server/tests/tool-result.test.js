import { describe, expect, test } from 'vitest';
import { toolFailure, toolSuccess } from '../src/tool-result.js';

describe('MCP tool result formatting', () => {
  test('wraps successful data in a structured JSON text response', () => {
    const result = toolSuccess({ customer_count: 1 });
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true, data: { customer_count: 1 } });
  });

  test('marks tool errors as MCP errors', () => {
    const result = toolFailure(new Error('Customer not found'));
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Customer not found');
  });
});
