import { test as base, Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';

type AuthFixtures = {
  adminPage: Page;
  employeePage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page, context }, use) => {
    const token = await encode({
      token: { 
        id: '00000000-0000-0000-0000-000000000001', 
        email: 'admin@tiqri.test', 
        role: 'GlobalAdmin', 
        name: 'Test Admin',
        accessTokenExpires: Date.now() + 1000 * 60 * 60 * 24 * 30, // Future date to bypass refresh
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    await context.addCookies([{
      name: 'next-auth.session-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await use(page);
  },
  
  employeePage: async ({ page, context }, use) => {
    const token = await encode({
      token: { 
        id: '00000000-0000-0000-0000-000000000002', 
        email: 'employee@tiqri.test', 
        role: 'Employee', 
        name: 'Test Employee',
        accessTokenExpires: Date.now() + 1000 * 60 * 60 * 24 * 30, // Future date to bypass refresh
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    await context.addCookies([{
      name: 'next-auth.session-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await use(page);
  },
});
