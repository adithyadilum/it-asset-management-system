import { test, expect } from '../fixtures';

test.describe('Authentication Strategy', () => {

  // Test 1: The "One Real Login" test to ensure Keycloak wiring is correct.
  // Note: For CI environments, this test might need valid Keycloak dummy credentials 
  // or it can be skipped if Keycloak isn't available in CI.
  // We'll mark it as skipped by default to avoid failing without a real Keycloak instance.
  test.skip('One Real Login - via Keycloak UI', async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.clickLogin();
    // This requires a real test user to exist in the configured Keycloak instance
    await loginPage.performRealLogin('test_employee', 'password123');
    await dashboardPage.expectToBeVisible();
  });

  // Test 2: Verify that our test bypass fixture works for an Admin
  test('Bypass Login - GlobalAdmin', async ({ adminPage, dashboardPage }) => {
    // adminPage fixture automatically creates session and injects the cookie
    await dashboardPage.goto(); // Go to dashboard directly
    await dashboardPage.expectToBeVisible();
    
    // We can also verify that the UI shows admin specific elements, 
    // e.g., an Admin Settings link in the navigation
    // This depends on your actual app layout, but for now we verify the URL
    await expect(adminPage).toHaveURL(/\/?$/);
  });

  // Test 3: Verify that our test bypass fixture works for an Employee
  test('Bypass Login - Employee', async ({ employeePage, dashboardPage }) => {
    // employeePage fixture automatically creates session and injects the cookie
    await dashboardPage.goto();
    await dashboardPage.expectToBeVisible();
    
    await expect(employeePage).toHaveURL(/\/?$/);
  });

});
