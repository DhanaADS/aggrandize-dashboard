const { chromium } = require('playwright');

async function testUniformHeights() {
  console.log('🧪 Testing uniform window heights...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/dashboard/todos');
    
    // Wait for page load
    await page.waitForTimeout(3000);
    
    // Check if logged in
    const isLoggedIn = await page.$('text=Access Denied') === null;
    
    if (!isLoggedIn) {
      console.log('❌ Not logged in - cannot test heights');
      await browser.close();
      return;
    }
    
    console.log('✅ User is logged in, testing heights...');
    
    // Take screenshot
    await page.screenshot({ path: 'uniform-heights-test.png', fullPage: false });
    
    // Test measurements using viewport dimensions
    const viewportHeight = page.viewportSize()?.height || 800;
    console.log(`📐 Viewport height: ${viewportHeight}px`);
    
    // Look for our fixed height containers
    const containerElements = await page.$$('[style*="height: 500px"]');
    console.log(`📦 Found ${containerElements.length} containers with 500px height`);
    
    if (containerElements.length >= 2) {
      console.log('✅ Multiple 500px height containers found - uniform heights implemented!');
    } else {
      console.log('⚠️  May need to check if all windows are using uniform heights');
    }
    
    // Check for main container
    const mainContainer = await page.$('[style*="height: 600px"]');
    if (mainContainer) {
      console.log('✅ Main container set to 600px height');
    }
    
    console.log('📸 Screenshot saved as uniform-heights-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  await browser.close();
}

testUniformHeights().catch(console.error);