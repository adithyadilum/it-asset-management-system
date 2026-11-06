import { test, expect } from '../fixtures';

test('dashboard navigation and refresh finish server rendering', async ({
  adminPage,
}) => {
  const renderingErrors: string[] = [];
  adminPage.on('pageerror', (error) => {
    renderingErrors.push(error.message);
  });
  for (let visit = 0; visit < 3; visit++) {
    await adminPage.goto('/dashboard');
    await expect(
      adminPage.getByRole('heading', { name: /Welcome back/i })
    ).toBeVisible();
    const refreshed = adminPage.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/dashboard' &&
        response.headers()['content-type']?.includes('text/x-component') ===
          true
    );
    await adminPage
      .getByRole('button', { name: 'Refresh dashboard data', exact: true })
      .click();
    const response = await refreshed;
    expect(response.ok()).toBe(true);
    expect(await response.finished()).toBeNull();
    await expect(
      adminPage.getByRole('heading', { name: /Welcome back/i })
    ).toBeVisible();
    expect(renderingErrors).toEqual([]);
  }
  expect(renderingErrors).toEqual([]);
});
