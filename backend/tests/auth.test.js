import { describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('authentication middleware', () => {
  test('rejects protected API calls without a bearer token', async () => {
    const app = createApp({
      corsOrigin: ['http://localhost:5173'],
      authDisabled: false,
      cognitoIssuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example',
      cognitoClientId: 'client-id'
    });

    const response = await request(app).get('/api/customers');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/missing bearer token/i);
  });
});
