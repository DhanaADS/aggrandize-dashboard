# Project Overview

This is a Next.js project bootstrapped with `create-next-app`. It uses Supabase for the database and NextAuth for authentication. The application is also configured as a Progressive Web App (PWA).

The project is a role-based access control dashboard with a modern Web3-inspired design.

## Building and Running

To get the development server running, use the following command:

```bash
npm run dev
```

This will start the development server on [http://localhost:3000](http://localhost:3000).

### Testing

The project uses Playwright for end-to-end testing. The following scripts are available for running tests:

*   `npm run test:e2e`: Run all end-to-end tests.
*   `npm run test:e2e:headed`: Run all end-to-end tests in headed mode.
*   `npm run test:e2e:debug`: Run all end-to-end tests in debug mode.
*   `npm run test:pwa`: Run PWA-specific tests.

## Development Conventions

*   **Framework:** The project is built with Next.js.
*   **Database:** Supabase is used for the database.
*   **Authentication:** NextAuth is used for authentication, with a Supabase adapter.
*   **Styling:** The project uses CSS Modules and has a custom theme.
*   **Linting:** ESLint is used for linting, but it is disabled during production builds.
*   **Type Checking:** TypeScript is used for type checking, but it is disabled during production builds.
