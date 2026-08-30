import { test, expect } from '../fixtures';

test.describe('Role boundary', () => {
  /**
   * An Employee must not reach a management route. Two independent things
   * enforce that -- `canAccessRoute` in the edge proxy, and a guard in the
   * route's own layout or page (`src/lib/auth/page-guard.ts`, or an inline
   * check) -- and every route under (management) has both.
   *
   * This asserts the outcome, not either mechanism. That is deliberate: the
   * boundary is what users are subject to, and asserting it holds regardless of
   * which layer stops the request. Pinning one layer would also be beyond what
   * an e2e test can honestly claim here, since with both in place a passing
   * assertion cannot distinguish them -- an earlier draft of this test targeted
   * /settings and went on passing with the edge gate forced wide open, because
   * master-data's own guard quietly caught it.
   *
   * Falsified by removing both layers: the run then ends on
   * /financials/depreciation and the assertion fails.
   *
   * The first half is a control. A redirect away from /financials proves
   * nothing on its own -- an unrecognised session cookie produces the same
   * shape of failure -- so the same session is first shown to be accepted where
   * it should be.
   */
  test('sends an Employee to /403 for a management route, not to /login', async ({
    employeePage,
  }) => {
    // Control: the session is valid and the role is read correctly. Employees
    // have no dashboard, so they are sent to /my-assets.
    await employeePage.goto('/');
    await expect(employeePage).toHaveURL(/\/my-assets$/);

    // The boundary.
    await employeePage.goto('/financials');
    await expect(employeePage).toHaveURL(/\/403$/);
    await expect(employeePage.getByText('403 - Access Denied')).toBeVisible();
  });
});
