import { test, expect } from '@playwright/test';

test('Debug Environment Variables', async ({ request }) => {
  const response = await request.get('/api/test/debug');
  const env = await response.json();
  console.log('Next.js Environment Variables:', env);
  expect(env.DATABASE_URL).toContain('localhost');
});
