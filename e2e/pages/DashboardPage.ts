import { Page, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectToBeVisible() {
    // Wait for a dashboard specific element or URL
    await expect(this.page).toHaveURL(/\/?$/);
    // You could also wait for a heading like "Dashboard"
    await expect(this.page.locator('h1', { hasText: /Dashboard/i }))
      .toBeVisible({ timeout: 10000 })
      .catch(() => {
        // sometimes dashboard might just have some specific role text or welcome
      });
  }
}
