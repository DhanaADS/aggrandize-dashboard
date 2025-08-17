const { chromium } = require('playwright');

async function visualHeightTest() {
  console.log('👁️  Visual height test - Creating comparison screenshots...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 800 });
  
  try {
    console.log('📍 Step 1: Navigate and wait for load');
    await page.goto('http://localhost:3000/dashboard/todos');
    await page.waitForTimeout(3000);
    
    const isLoggedIn = await page.$('text=Access Denied') === null;
    if (!isLoggedIn) {
      console.log('❌ Please login manually to test window heights');
      await page.waitForTimeout(10000); // Give time to login manually
    }
    
    console.log('📍 Step 2: Take screenshot of main view');
    await page.screenshot({ 
      path: 'height-test-main-view.png',
      fullPage: false 
    });
    
    console.log('📍 Step 3: Try to click a task to open chat');
    try {
      // Look for task rows
      const taskElements = await page.$$('[data-task-id], tr[style*="cursor: pointer"]');
      if (taskElements.length > 0) {
        await taskElements[0].click();
        await page.waitForTimeout(2000);
        
        console.log('📍 Step 4: Take screenshot with chat open');
        await page.screenshot({ 
          path: 'height-test-with-chat.png',
          fullPage: false 
        });
      } else {
        console.log('⚠️  No clickable tasks found');
      }
    } catch (error) {
      console.log('⚠️  Could not click task:', error.message);
    }
    
    console.log('📍 Step 5: Test completed sidebar expansion');
    try {
      const expandButton = await page.$('button[title="Expand"], button:has-text("→")');
      if (expandButton) {
        await expandButton.click();
        await page.waitForTimeout(1000);
        
        console.log('📍 Step 6: Screenshot with expanded sidebar');
        await page.screenshot({ 
          path: 'height-test-expanded-sidebar.png',
          fullPage: false 
        });
      }
    } catch (error) {
      console.log('⚠️  Could not expand sidebar:', error.message);
    }
    
    console.log('\n✅ Visual tests complete!');
    console.log('📸 Screenshots saved:');
    console.log('   - height-test-main-view.png');
    console.log('   - height-test-with-chat.png'); 
    console.log('   - height-test-expanded-sidebar.png');
    console.log('\n🎯 Check these images to verify:');
    console.log('   1. All windows have same 500px height');
    console.log('   2. Completed panel, task list, and chat are uniform');
    console.log('   3. Proper scrolling within each window');
    
  } catch (error) {
    console.error('❌ Visual test failed:', error);
  }
  
  await browser.close();
}

visualHeightTest().catch(console.error);