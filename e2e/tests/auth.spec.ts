import { test, expect } from '../fixtures';

test.describe('Authentication Strategy', () => {
  // Test 1: The "One Real Login" test to ensure Keycloak wiring is correct.
  // Note: For CI environments, this test might need valid Keycloak dummy credentials
  // or it can be skipped if Keycloak isn't available in CI.
  // We'll mark it as skipped by default to avoid failing without a real Keycloak instance.
  test.skip('One Real Login - via Keycloak UI', async ({
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.goto();
    await loginPage.clickLogin();
    // This requires a real test user to exist in the configured Keycloak instance
    await loginPage.performRealLogin('test_employee', 'password123');
    await dashboardPage.expectLandedOn(/\/my-assets$/, /My Assets/i);
  });

  // Test 2: Verify that our test bypass fixture works for an Admin
  test('Bypass Login - GlobalAdmin', async ({ adminPage, dashboardPage }) => {
    // adminPage fixture automatically creates session and injects the cookie
    await dashboardPage.goto();

    // A GlobalAdmin has a dashboard, so `/` resolves to it.
    await dashboardPage.expectLandedOn(/\/dashboard$/, /Welcome back/i);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
  });

  // Test 3: Verify that our test bypass fixture works for an Employee
  test('Bypass Login - Employee', async ({ employeePage, dashboardPage }) => {
    // employeePage fixture automatically creates session and injects the cookie
    await dashboardPage.goto();

    // Employees have no dashboard; the proxy sends them to their own assets.
    await dashboardPage.expectLandedOn(/\/my-assets$/, /My Assets/i);
    await expect(employeePage).toHaveURL(/\/my-assets$/);
  });
});
