# TeamHub PWA Testing Guide

This directory contains comprehensive end-to-end tests for the TeamHub Progressive Web App using Playwright.

## 🧪 Test Structure

```
tests/
├── e2e/
│   └── pwa/
│       ├── teamhub-core.spec.ts      # Core PWA functionality tests
│       ├── teamhub-install.spec.ts   # PWA installation & manifest tests
│       └── teamhub-mobile.spec.ts    # Mobile-specific tests
├── fixtures/
│   └── test-data.ts                  # Mock data and test helpers
├── utils/
│   ├── pwa-helpers.ts                # PWA testing utilities
│   └── auth-helpers.ts               # Authentication helpers
├── setup/
│   ├── global-setup.ts               # Global test setup
│   └── global-teardown.ts            # Global test cleanup
└── README.md                         # This file
```

## 🚀 Getting Started

### 1. Install Playwright Browsers
```bash
npm run test:install
```

### 2. Run All PWA Tests
```bash
npm run test:pwa
```

### 3. Run Specific Test Suites
```bash
# Core functionality tests
npm run test:pwa:core

# PWA installation tests
npm run test:pwa:install

# Mobile experience tests
npm run test:pwa:mobile

# Mobile-only tests
npm run test:mobile

# Tablet-only tests
npm run test:tablet
```

## 📱 Test Categories

### Core Functionality Tests (`teamhub-core.spec.ts`)
- ✅ PWA loading and navigation
- ✅ Task creation, editing, deletion
- ✅ Task status updates
- ✅ Real-time chat functionality
- ✅ Team collaboration features
- ✅ Statistics and alerts
- ✅ Tab navigation
- ✅ Real-time synchronization
- ✅ Permission handling

### Installation Tests (`teamhub-install.spec.ts`)
- ✅ PWA manifest validation
- ✅ Service worker registration
- ✅ Icon loading verification
- ✅ Offline functionality
- ✅ Cache management
- ✅ Meta tags validation
- ✅ Notification permissions
- ✅ PWA shortcuts and share targets

### Mobile Experience Tests (`teamhub-mobile.spec.ts`)
- ✅ Responsive design across devices
- ✅ Touch interactions and gestures
- ✅ Mobile-specific features
- ✅ Pull-to-refresh functionality
- ✅ Keyboard handling
- ✅ Orientation changes
- ✅ Performance on mobile devices

## 🔧 Advanced Testing Options

### Run Tests with UI
```bash
npm run test:e2e:headed
```

### Debug Tests
```bash
npm run test:e2e:debug
```

### View Test Reports
```bash
npm run test:report
```

### View Test Traces
```bash
npm run test:trace
```

### Run Tests on Specific Browsers
```bash
# Chrome desktop
npx playwright test --project=chromium-desktop

# Mobile Chrome
npx playwright test --project=mobile-chrome

# Mobile Safari
npx playwright test --project=mobile-safari

# All mobile projects
npx playwright test --project=mobile-*
```

## 📊 Test Configuration

The tests are configured with multiple browser projects:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)
- **Tablet**: Chrome (iPad Pro)
- **PWA-specific**: Chrome with PWA optimizations

### Environment Variables

Set these environment variables to customize test behavior:

```bash
# Test against production instead of local dev server
export PLAYWRIGHT_TEST_BASE_URL=https://app.aggrandizedigital.com

# Run tests in CI mode
export CI=true
```

## 🧪 Test Data

The test suite uses mock data from `fixtures/test-data.ts`:

### Test Users
- **Admin**: dhana@aggrandizedigital.com
- **Marketing**: veera@aggrandizedigital.com, saravana@aggrandizedigital.com, saran@aggrandizedigital.com
- **Processing**: abbas@aggrandizedigital.com, gokul@aggrandizedigital.com

### Test Scenarios
- Task creation and management
- Team collaboration
- Real-time messaging
- Status updates and progress tracking
- Mobile interactions

## 🔍 Debugging Failed Tests

### 1. View Screenshots
Failed tests automatically capture screenshots in `test-results/`

### 2. Watch Test Execution
```bash
npm run test:e2e:headed
```

### 3. Step-by-Step Debugging
```bash
npm run test:e2e:debug
```

### 4. Check Browser Console
Test output includes browser console logs for debugging.

## 📈 Test Coverage

The test suite covers:

### ✅ PWA Standards Compliance
- Web App Manifest validation
- Service Worker functionality  
- Installability requirements
- Offline capabilities
- Performance metrics

### ✅ Core Features
- User authentication
- Task management (CRUD operations)
- Real-time chat and collaboration
- Team member interactions
- Status tracking and updates
- Mobile responsive design

### ✅ User Experience
- Touch interactions
- Keyboard navigation
- Accessibility features
- Performance optimization
- Error handling

## 🚀 Running Tests in CI/CD

### GitHub Actions Example
```yaml
name: PWA Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:install
      - run: npm run test:pwa
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

## 📝 Writing New Tests

### 1. Follow Existing Patterns
```typescript
import { test, expect } from '@playwright/test';
import { PWAHelpers } from '../../utils/pwa-helpers';
import { AuthHelpers } from '../../utils/auth-helpers';

test.describe('Your Test Suite', () => {
  let pwaHelpers: PWAHelpers;
  let authHelpers: AuthHelpers;
  
  test.beforeEach(async ({ page }) => {
    pwaHelpers = new PWAHelpers(page);
    authHelpers = new AuthHelpers(page);
    
    // Setup authentication
    const user = TestDataHelper.getAdminUser();
    await authHelpers.ensureAuthenticated(user);
  });
  
  test('should do something', async ({ page }) => {
    // Your test logic here
  });
});
```

### 2. Use Helper Functions
- `PWAHelpers` for PWA-specific testing
- `AuthHelpers` for authentication
- `TestDataHelper` for mock data

### 3. Follow Test Best Practices
- Use descriptive test names
- Test one thing at a time
- Clean up after tests
- Handle async operations properly
- Use appropriate assertions

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev/)
- [PWA Testing Best Practices](https://web.dev/pwa-testing/)
- [TeamHub PWA Guide](../docs/pwa-guide.md)

## 📞 Support

For issues with the test suite:
1. Check test output and screenshots
2. Review browser console logs
3. Verify test data and environment
4. Report issues with detailed reproduction steps