import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'github' : [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 10000,
    
    /* Global timeout for page navigation */
    navigationTimeout: 30000,
    
    /* Set test mode headers for all requests */
    extraHTTPHeaders: {
      'x-playwright-test': 'true'
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable service worker testing
        contextOptions: {
          // Required for service worker testing
          permissions: ['notifications'],
        },
      },
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        contextOptions: {
          permissions: ['notifications'],
        },
      },
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        contextOptions: {
          permissions: ['notifications'],
        },
      },
    },

    /* Mobile testing */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        contextOptions: {
          permissions: ['notifications'],
        },
      },
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        contextOptions: {
          permissions: ['notifications'],
        },
      },
    },

    /* Tablet testing */
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        contextOptions: {
          permissions: ['notifications'],
        },
      },
    },

    /* PWA-specific testing configurations */
    {
      name: 'pwa-chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['notifications'],
          // Enable service workers and offline testing
          serviceWorkers: 'allow',
        },
        // PWA-specific settings
        launchOptions: {
          args: [
            '--enable-features=VaapiVideoDecoder',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions-except=/path/to/extension',
            '--load-extension=/path/to/extension',
          ],
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: process.env.CI ? undefined : {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true, // Always reuse existing server
  //   timeout: 120000, // 2 minutes
  // },

  /* Test timeout */
  timeout: 60000, // 1 minute per test

  /* Global setup and teardown */
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',

  /* Test output directory */
  outputDir: 'test-results/',
  
  /* Expect configuration */
  expect: {
    /* Timeout for expect() assertions */
    timeout: 10000,
    
    /* Configure visual comparisons */
    toHaveScreenshot: {
      // An acceptable amount of pixels that could be different
      threshold: 0.2,
      // An acceptable ratio of pixels that are different to the total amount of pixels, between 0 and 1
      maxDiffPixels: 100,
    },
    
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
});