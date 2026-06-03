import { test, expect } from '@playwright/test';

test('Homepage redirects to Keycloak login', async ({ page }) => {
  // Go to the local dashboard
  await page.goto('http://127.0.0.1:3000/');

  // Because of NextAuth, we should be instantly redirected to the Keycloak SSO page.
  // Let's verify the URL changes to include your Keycloak domain or the NextAuth signin page.
  await expect(page).toHaveURL(/.*api\/auth\/signin.*/);
  
  // Verify there is a login button on the screen
  const loginBtn = page.getByRole('button', { name: /Sign in/i });
  await expect(loginBtn).toBeVisible();
});