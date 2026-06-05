import { mergeTests } from '@playwright/test';
import { test as authTest } from './auth';
import { test as dbTest } from './db';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// Combine the auth and db fixtures
const baseTest = mergeTests(authTest, dbTest);

// Extend with Page Object Models
export const test = baseTest.extend<{
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
