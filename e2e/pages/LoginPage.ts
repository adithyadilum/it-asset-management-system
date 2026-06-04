import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async clickLogin() {
    // This assumes there's a button to sign in with Keycloak
    const loginButton = this.page.locator('button', { hasText: /sign in/i }).first();
    await loginButton.click();
  }

  // The 'One Real Login' test helper
  async performRealLogin(username: string, password: string) {
    // Wait for redirect to Keycloak
    await expect(this.page).toHaveURL(/keycloak/i);
    
    // Fill in Keycloak credentials
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    
    // Submit
    await this.page.locator('input[name="login"]').click();
  }
}
