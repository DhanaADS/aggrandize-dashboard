const { chromium } = require('playwright');

async function manualLoginTest() {
  console.log('🌐 Opening browser for manual login and height testing...');
  console.log('👆 You will have 5 minutes to login manually');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
    args: ['--start-maximized', '--disable-web-security'],
    timeout: 0 // Disable timeout
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    console.log('📍 Opening todos page...');
    await page.goto('http://localhost:3000/dashboard/teamhub');
    
    console.log('⏳ Waiting for manual login...');
    console.log('🔑 Please login in the browser window that opened');
    console.log('📋 After login, you can test the window heights');
    
    // Keep checking if user is logged in
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      try {
        const accessDenied = await page.$('text=Access Denied');
        const loginButton = await page.$('button:has-text("Continue with Google")');
        
        if (!accessDenied && !loginButton) {
          console.log('✅ Login successful! Testing window heights...');
          
          // Wait for page to fully load
          await page.waitForTimeout(3000);
          
          // Take initial screenshot
          await page.screenshot({ 
            path: 'manual-test-logged-in.png',
            fullPage: false 
          });
          console.log('📸 Screenshot saved: manual-test-logged-in.png');
          
          // Try to measure elements using JavaScript
          const measurements = await page.evaluate(() => {
            const results = {};
            
            // Look for containers with specific heights
            const containers = document.querySelectorAll('[style*="500px"]');
            results.containers500px = containers.length;
            
            // Measure completed sidebar
            const sidebar = document.querySelector('[style*="width: 60px"], [style*="width: 320px"]');
            if (sidebar) {
              const rect = sidebar.getBoundingClientRect();
              results.sidebarHeight = Math.round(rect.height);
            }
            
            // Measure task list area
            const taskArea = document.querySelector('[style*="overflowY: auto"]');
            if (taskArea) {
              const rect = taskArea.getBoundingClientRect();
              results.taskAreaHeight = Math.round(rect.height);
            }
            
            return results;
          });
          
          console.log('📏 Height measurements:');
          console.log(`   - Containers with 500px: ${measurements.containers500px}`);
          if (measurements.sidebarHeight) {
            console.log(`   - Sidebar height: ${measurements.sidebarHeight}px`);
          }
          if (measurements.taskAreaHeight) {
            console.log(`   - Task area height: ${measurements.taskAreaHeight}px`);
          }
          
          // Test clicking a task
          console.log('🖱️  Testing task click for chat window...');
          try {
            // Wait a bit and look for task rows
            await page.waitForTimeout(2000);
            
            // Try different selectors for tasks
            const taskRow = await page.locator('tr[data-task-id]').first();
            const taskCount = await page.locator('tr[data-task-id]').count();
            
            console.log(`📋 Found ${taskCount} tasks`);
            
            if (taskCount > 0) {
              await taskRow.click();
              await page.waitForTimeout(2000);
              
              // Take screenshot with chat open
              await page.screenshot({ 
                path: 'manual-test-with-chat.png',
                fullPage: false 
              });
              console.log('📸 Chat screenshot: manual-test-with-chat.png');
              
              // Measure chat window
              const chatMeasurement = await page.evaluate(() => {
                // Look for chat container
                const chatContainer = document.querySelector('[style*="💬"]');
                if (chatContainer) {
                  const rect = chatContainer.getBoundingClientRect();
                  return Math.round(rect.height);
                }
                return null;
              });
              
              if (chatMeasurement) {
                console.log(`   - Chat window height: ${chatMeasurement}px`);
              }
            }
          } catch (error) {
            console.log('⚠️  Could not test task clicking:', error.message);
          }
          
          console.log('\n🎉 Manual test complete!');
          console.log('📊 Review the screenshots to verify uniform heights');
          console.log('⏸️  Browser will stay open for 30 more seconds for manual inspection');
          
          await page.waitForTimeout(30000);
          break;
        }
        
        // Still need to login
        attempts++;
        await page.waitForTimeout(5000);
        
        if (attempts % 6 === 0) { // Every 30 seconds
          console.log(`⏳ Still waiting for login... (${Math.round(attempts/12)} minutes elapsed)`);
        }
        
      } catch (error) {
        console.log('⚠️  Error checking login status:', error.message);
        attempts++;
        await page.waitForTimeout(5000);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Timeout waiting for login');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('🔚 Closing browser...');
  await browser.close();
}

manualLoginTest().catch(console.error);