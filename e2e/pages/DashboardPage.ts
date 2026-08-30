import { Page, expect } from '@playwright/test';

/**
 * The landing page for a signed-in user.
 *
 * Which page that is depends on the role: only roles with a dashboard land on
 * /dashboard, while an Employee is redirected to /my-assets. Both are reached
 * by opening `/`, so the destination is an assertion the caller makes rather
 * than something this object assumes.
 */
export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    // `domcontentloaded` rather than the default `load`: the app streams and
    // keeps connections open, so waiting for full load intermittently sat
    // until the 30s timeout even though the page was interactive.
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Asserts where the redirect landed and that the page actually rendered.
   *
   * The URL check used to be `toHaveURL(/\/?$/)`, a pattern every string
   * matches, and the heading check swallowed its own failure in a `.catch()`.
   * Between them the assertion could not fail, so these specs passed whatever
   * the app did.
   */
  async expectLandedOn(pathname: RegExp, heading: RegExp) {
    await expect(this.page).toHaveURL(pathname);
    await expect(
      this.page.getByRole('heading', { name: heading })
    ).toBeVisible();
  }
}
