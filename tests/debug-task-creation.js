const { chromium } = require('playwright');

async function debugTaskCreation() {
  console.log('🔍 Starting Playwright debug for task creation...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down actions
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages and errors
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error));
  page.on('requestfailed', request => console.log('FAILED REQUEST:', request.url()));
  
  try {
    console.log('📍 Step 1: Navigate to todos page');
    await page.goto('http://localhost:3000/dashboard/teamhub');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Step 2: Check if we need to login');
    const loginForm = await page.$('form[action*="auth"]');
    if (loginForm) {
      console.log('⚠️  Login required - cannot proceed with automated test');
      console.log('💡 Please login manually and run test again');
      await browser.close();
      return;
    }
    
    console.log('📍 Step 3: Look for task creation button');
    
    // First, let's see what's actually on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check for access denied or loading states
    const accessDenied = await page.$('text=Access Denied');
    if (accessDenied) {
      console.log('❌ Access denied - user not logged in or not team member');
      await page.screenshot({ path: 'debug-access-denied.png' });
      await browser.close();
      return;
    }
    
    const loadingText = await page.$('text=Loading tasks...');
    if (loadingText) {
      console.log('⏳ Page still loading, waiting...');
      await page.waitForTimeout(3000);
    }
    
    // Try multiple selectors for the create button
    let createButton = await page.$('button:has-text("Create New Task")');
    if (!createButton) {
      createButton = await page.$('button:has-text("Create Task")');
    }
    if (!createButton) {
      createButton = await page.$('button:has-text("➕")');
    }
    
    if (!createButton) {
      console.log('❌ Create task button not found with any selector');
      
      // Let's see what buttons ARE on the page
      const allButtons = await page.$$('button');
      console.log(`Found ${allButtons.length} buttons on the page`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        console.log(`Button ${i}: "${buttonText}"`);
      }
      
      await page.screenshot({ path: 'debug-no-create-button.png' });
      await browser.close();
      return;
    }
    
    console.log('📍 Step 4: Click create task button');
    await createButton.click();
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    console.log('📍 Step 5: Check if modal appeared');
    const modal = await page.$('[style*="position: fixed"]');
    if (!modal) {
      console.log('❌ Modal did not appear');
      await page.screenshot({ path: 'debug-no-modal.png' });
      await browser.close();
      return;
    }
    
    console.log('📍 Step 6: Fill in task details');
    await page.fill('input[placeholder*="task title"]', 'Test Task from Playwright');
    await page.fill('textarea[placeholder*="description"]', 'This is a test task created by Playwright for debugging');
    
    // Select priority if available
    const prioritySelect = await page.$('select');
    if (prioritySelect) {
      await prioritySelect.selectOption('high');
    }
    
    console.log('📍 Step 7: Get initial task count');
    const initialTasks = await page.$$('tr[data-task-id]');
    console.log(`Initial task count: ${initialTasks.length}`);
    
    console.log('📍 Step 8: Submit the form');
    const submitButton = await page.$('button:has-text("Create Task")');
    if (submitButton) {
      await submitButton.click();
    } else {
      console.log('❌ Submit button not found');
      await page.screenshot({ path: 'debug-no-submit.png' });
      await browser.close();
      return;
    }
    
    console.log('📍 Step 9: Wait for creation process');
    await page.waitForTimeout(3000);
    
    console.log('📍 Step 10: Check if modal closed');
    const modalAfter = await page.$('[style*="position: fixed"]');
    if (modalAfter) {
      console.log('⚠️  Modal is still open - creation might have failed');
    } else {
      console.log('✅ Modal closed - creation might have succeeded');
    }
    
    console.log('📍 Step 11: Check final task count');
    const finalTasks = await page.$$('tr[data-task-id]');
    console.log(`Final task count: ${finalTasks.length}`);
    
    if (finalTasks.length > initialTasks.length) {
      console.log('✅ New task appears to have been created!');
    } else {
      console.log('❌ No new task found in the table');
      
      // Check for error messages
      const errorMessages = await page.$$('text=/error/i');
      if (errorMessages.length > 0) {
        console.log('🚨 Error messages found on page');
      }
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-task-not-created.png' });
    }
    
    console.log('📍 Step 12: Check browser network requests');
    // This would show us if API calls are being made
    
    console.log('🔍 Debug session complete. Check console output and screenshots.');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
    await page.screenshot({ path: 'debug-error.png' });
  }
  
  await browser.close();
}

// Run the debug session
debugTaskCreation().catch(console.error);