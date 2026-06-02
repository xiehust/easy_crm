import { describe, expect, test } from 'vitest';
import { runMigrationsWithRetry } from '../src/migrations.js';

describe('migrations', () => {
  test('retries a transient migration failure before succeeding', async () => {
    let attempts = 0;

    await runMigrationsWithRetry(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw Object.assign(new Error('database not ready'), { code: 'ENOTFOUND' });
      }
    }, { attempts: 3, delayMs: 0 });

    expect(attempts).toBe(3);
  });
});
