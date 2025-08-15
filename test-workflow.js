// Simple test script to verify workflow creation works
const { workflowEngine } = require('./src/lib/workflow/engine.ts');

async function testWorkflow() {
  console.log('Testing workflow creation...');
  
  const simpleWorkflow = {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'Simple test workflow',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        nodeType: 'start',
        title: 'Start',
        position: { x: 200, y: 200 },
        properties: {},
        status: 'idle'
      },
      {
        id: 'http-1',
        type: 'source', 
        nodeType: 'http-request',
        title: 'HTTP Request',
        position: { x: 400, y: 200 },
        properties: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET'
        },
        status: 'idle'
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'start-1',
        targetNodeId: 'http-1',
        sourcePort: 'main',
        targetPort: 'input'
      }
    ],
    variables: {},
    settings: {
      maxRetries: 3,
      timeout: 30000,
      parallelExecution: false,
      errorStrategy: 'stop'
    }
  };

  try {
    const result = await workflowEngine.executeWorkflow(
      simpleWorkflow,
      {},
      'test-user',
      'manual'
    );
    
    console.log('Workflow execution result:', result);
    console.log('✅ Workflow creation test passed!');
  } catch (error) {
    console.error('❌ Workflow creation test failed:', error);
  }
}

testWorkflow();