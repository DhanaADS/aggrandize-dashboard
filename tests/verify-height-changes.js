const fs = require('fs');
const path = require('path');

function verifyHeightChanges() {
  console.log('🔍 Verifying height changes in source code...');
  
  try {
    // Check TaskChatContainer
    const containerPath = path.join(__dirname, '../src/components/todos/TaskChatContainer.tsx');
    const containerContent = fs.readFileSync(containerPath, 'utf8');
    
    // Check CompletedTasksSidebar  
    const sidebarPath = path.join(__dirname, '../src/components/todos/CompletedTasksSidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    console.log('📋 Checking TaskChatContainer.tsx:');
    
    // Check for 500px heights
    const container500pxMatches = (containerContent.match(/height: '500px'/g) || []).length;
    console.log(`   ✅ Found ${container500pxMatches} instances of "height: '500px'"`);
    
    // Check for 600px main container
    const container600pxMatches = (containerContent.match(/height: '600px'/g) || []).length;
    console.log(`   ✅ Found ${container600pxMatches} instances of "height: '600px'" (main container)`);
    
    console.log('📋 Checking CompletedTasksSidebar.tsx:');
    
    // Check sidebar height
    const sidebar500pxMatches = (sidebarContent.match(/height: '500px'/g) || []).length;
    console.log(`   ✅ Found ${sidebar500pxMatches} instances of "height: '500px'"`);
    
    // Check for old heights that should be removed
    const oldHeights = [
      { pattern: /height: '100vh'/g, name: '100vh' },
      { pattern: /height: '400px'/g, name: '400px' },
      { pattern: /height: '90vh'/g, name: '90vh' },
      { pattern: /calc\(90vh - 80px\)/g, name: 'calc(90vh - 80px)' }
    ];
    
    console.log('📋 Checking for old height values:');
    
    oldHeights.forEach(({ pattern, name }) => {
      const containerMatches = (containerContent.match(pattern) || []).length;
      const sidebarMatches = (sidebarContent.match(pattern) || []).length;
      const total = containerMatches + sidebarMatches;
      
      if (total > 0) {
        console.log(`   ⚠️  Found ${total} instances of old "${name}" (should be updated)`);
      } else {
        console.log(`   ✅ No old "${name}" found`);
      }
    });
    
    console.log('\n📊 Summary:');
    const total500px = container500pxMatches + sidebar500pxMatches;
    const has600px = container600pxMatches > 0;
    
    if (total500px >= 3 && has600px) {
      console.log('🎉 SUCCESS! All windows should now have uniform 500px height');
      console.log(`   - Found ${total500px} windows with 500px height`);
      console.log(`   - Found main container with 600px height`);
      console.log('   - Uniform height implementation is complete!');
    } else {
      console.log('⚠️  Height changes may be incomplete:');
      console.log(`   - 500px heights found: ${total500px} (expected: 3+)`);
      console.log(`   - 600px main container: ${has600px} (expected: true)`);
    }
    
    console.log('\n💡 To test visually:');
    console.log('   1. Login to your regular browser');
    console.log('   2. Go to http://localhost:3000/dashboard/teamhub');
    console.log('   3. Check that completed panel, task list, and chat window are same height');
    console.log('   4. All should be 500px tall with internal scrolling');
    
  } catch (error) {
    console.error('❌ Error verifying changes:', error.message);
  }
}

verifyHeightChanges();