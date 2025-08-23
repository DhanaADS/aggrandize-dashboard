const { chromium } = require('playwright');

async function debugWindowHeights() {
  console.log('🔍 Starting Playwright debug for window heights...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error));
  
  try {
    console.log('📍 Step 1: Navigate to todos page');
    await page.goto('http://localhost:3000/dashboard/teamhub');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Step 2: Check if user is logged in');
    const accessDenied = await page.$('text=Access Denied');
    if (accessDenied) {
      console.log('❌ Need to login first - stopping test');
      await browser.close();
      return;
    }
    
    console.log('📍 Step 3: Wait for page to load completely');
    await page.waitForTimeout(2000);
    
    console.log('📍 Step 4: Measure current window heights');
    
    // Get completed tasks sidebar height
    const completedSidebar = await page.$('[style*="width: 60px"], [style*="width: 320px"]');
    let completedHeight = null;
    if (completedSidebar) {
      const completedBox = await completedSidebar.boundingBox();
      completedHeight = completedBox?.height;
      console.log(`📏 Completed sidebar height: ${completedHeight}px`);
    } else {
      console.log('⚠️  Completed sidebar not found');
    }
    
    // Get task list container height
    const taskListContainer = await page.$('[style*="height: 400px"]');
    let taskListHeight = null;
    if (taskListContainer) {
      const taskListBox = await taskListContainer.boundingBox();
      taskListHeight = taskListBox?.height;
      console.log(`📏 Task list height: ${taskListHeight}px`);
    } else {
      console.log('⚠️  Task list container not found, looking for alternative selector');
      const altTaskList = await page.$('[style*="overflowY: auto"]');
      if (altTaskList) {
        const altBox = await altTaskList.boundingBox();
        taskListHeight = altBox?.height;
        console.log(`📏 Task list height (alt): ${taskListHeight}px`);
      }
    }
    
    // Click on a task to open chat window
    console.log('📍 Step 5: Click on first task to open chat');
    const firstTask = await page.$('tr[data-task-id], [style*="cursor: pointer"]');
    if (firstTask) {
      await firstTask.click();
      await page.waitForTimeout(1000);
      
      // Measure chat window height
      const chatWindow = await page.$('[style*="💬"], [style*="CommentThread"]');
      let chatHeight = null;
      if (chatWindow) {
        const chatBox = await chatWindow.boundingBox();
        chatHeight = chatBox?.height;
        console.log(`📏 Chat window height: ${chatHeight}px`);
      } else {
        console.log('⚠️  Chat window not found, looking for selected task container');
        const selectedTask = await page.$('[style*="Selected Task"]');
        if (selectedTask) {
          const selectedBox = await selectedTask.boundingBox();
          chatHeight = selectedBox?.height;
          console.log(`📏 Selected task container height: ${chatHeight}px`);
        }
      }
    } else {
      console.log('⚠️  No tasks found to click');
    }
    
    console.log('📍 Step 6: Analysis and recommendations');
    
    if (completedHeight && taskListHeight) {
      console.log(`\n📊 HEIGHT COMPARISON:`);
      console.log(`Completed Sidebar: ${completedHeight}px`);
      console.log(`Task List: ${taskListHeight}px`);
      if (taskListHeight) console.log(`Chat Window: ${taskListHeight}px`);
      
      const heights = [completedHeight, taskListHeight].filter(h => h !== null);
      const maxHeight = Math.max(...heights);
      const minHeight = Math.min(...heights);
      const heightDiff = maxHeight - minHeight;
      
      console.log(`\n📏 Height difference: ${heightDiff}px`);
      
      if (heightDiff > 50) {
        console.log(`❌ Heights are inconsistent! Difference of ${heightDiff}px`);
        console.log(`💡 Recommendation: Set all windows to ${Math.min(600, maxHeight)}px height`);
      } else {
        console.log(`✅ Heights are relatively consistent`);
      }
    }
    
    console.log('📍 Step 7: Take screenshot for visual inspection');
    await page.screenshot({ path: 'window-heights-debug.png', fullPage: true });
    
    console.log('🔍 Debug complete! Check window-heights-debug.png for visual inspection');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    await page.screenshot({ path: 'window-heights-error.png' });
  }
  
  await browser.close();
}

// Run the debug
debugWindowHeights().catch(console.error);