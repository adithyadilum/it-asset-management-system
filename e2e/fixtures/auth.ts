import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  adminPage: Page;
  employeePage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page, context, request }, use) => {
    // 1. Call the bypass API route
    const res = await request.post('/api/test/auth', {
      data: { role: 'GlobalAdmin' },
    });
    
    if (!res.ok()) {
      const errorText = await res.text();
      throw new Error(`Failed to bypass auth for GlobalAdmin: ${errorText}`);
    }
    
    // 2. Extract the generated cookie
    const data = await res.json();
    
    // 3. Inject the cookie into the browser context
    await context.addCookies([{
      name: data.cookieName,
      value: data.token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    // 4. Provide the authenticated page to the test
    await use(page);
  },
  
  employeePage: async ({ page, context, request }, use) => {
    const res = await request.post('/api/test/auth', {
      data: { role: 'Employee' },
    });
    
    if (!res.ok()) {
      const errorText = await res.text();
      throw new Error(`Failed to bypass auth for Employee: ${errorText}`);
    }
    
    const data = await res.json();
    
    await context.addCookies([{
      name: data.cookieName,
      value: data.token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await use(page);
  },
});
