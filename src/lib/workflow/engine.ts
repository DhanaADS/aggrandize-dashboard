// Workflow Execution Engine
import { 
  WorkflowDefinition, 
  WorkflowRun, 
  WorkflowNode, 
  NodeConnection,
  NodeExecutionContext,
  NodeExecutionResult 
} from './types';
import { NodeExecutorRegistry } from './executors/registry';
import { createServiceContainer } from './services/container';

export class WorkflowExecutionEngine {
  private executorRegistry: NodeExecutorRegistry;
  private activeRuns: Map<string, WorkflowExecution> = new Map();

  constructor() {
    this.executorRegistry = new NodeExecutorRegistry();
  }

  async executeWorkflow(
    workflow: WorkflowDefinition, 
    inputData: any = {}, 
    userId: string,
    triggerType: 'manual' | 'scheduled' | 'webhook' | 'api' = 'manual'
  ): Promise<WorkflowRun> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workflowRun: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      userId,
      status: 'pending',
      triggerType,
      startedAt: new Date(),
      inputData,
      outputData: {},
      progress: {
        completedNodes: 0,
        totalNodes: workflow.nodes.length,
        currentStep: 'Initializing...'
      }
    };

    // Create execution instance
    const execution = new WorkflowExecution(
      workflow, 
      workflowRun, 
      this.executorRegistry
    );

    this.activeRuns.set(runId, execution);

    try {
      // Start execution
      const result = await execution.execute();
      workflowRun.status = result.success ? 'completed' : 'failed';
      workflowRun.completedAt = new Date();
      workflowRun.outputData = result.data;
      workflowRun.error = result.error;

      return workflowRun;
    } catch (error) {
      workflowRun.status = 'failed';
      workflowRun.completedAt = new Date();
      workflowRun.error = error instanceof Error ? error.message : 'Unknown error';
      
      return workflowRun;
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  async cancelWorkflow(runId: string): Promise<boolean> {
    const execution = this.activeRuns.get(runId);
    if (execution) {
      await execution.cancel();
      this.activeRuns.delete(runId);
      return true;
    }
    return false;
  }

  getActiveRuns(): WorkflowRun[] {
    return Array.from(this.activeRuns.values()).map(exec => exec.getRunStatus());
  }

  getRunStatus(runId: string): WorkflowRun | null {
    const execution = this.activeRuns.get(runId);
    return execution ? execution.getRunStatus() : null;
  }
}

class WorkflowExecution {
  private workflow: WorkflowDefinition;
  private workflowRun: WorkflowRun;
  private executorRegistry: NodeExecutorRegistry;
  private nodeStatuses: Map<string, string> = new Map();
  private nodeOutputs: Map<string, any> = new Map();
  private cancelled = false;
  private services: any;

  constructor(
    workflow: WorkflowDefinition,
    workflowRun: WorkflowRun,
    executorRegistry: NodeExecutorRegistry
  ) {
    this.workflow = workflow;
    this.workflowRun = workflowRun;
    this.executorRegistry = executorRegistry;
    this.services = createServiceContainer();
  }

  async execute(): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      this.workflowRun.status = 'running';
      this.workflowRun.progress.currentStep = 'Starting workflow execution...';

      // Find start nodes (nodes with no incoming connections)
      const startNodes = this.findStartNodes();
      
      if (startNodes.length === 0) {
        throw new Error('No start nodes found in workflow');
      }

      // Execute nodes in topological order
      const executionOrder = this.getExecutionOrder();
      
      for (const nodeId of executionOrder) {
        if (this.cancelled) {
          throw new Error('Workflow execution cancelled');
        }

        const node = this.workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        this.workflowRun.progress.currentStep = `Executing: ${node.title}`;
        await this.executeNode(node);
        
        this.workflowRun.progress.completedNodes++;
      }

      // Collect final outputs
      const outputNodes = this.findOutputNodes();
      const finalOutput: any = {};
      
      for (const outputNode of outputNodes) {
        const nodeOutput = this.nodeOutputs.get(outputNode.id);
        if (nodeOutput) {
          finalOutput[outputNode.id] = nodeOutput;
        }
      }

      return {
        success: true,
        data: finalOutput
      };

    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeNode(node: WorkflowNode): Promise<void> {
    this.nodeStatuses.set(node.id, 'running');
    
    try {
      // Get input data from connected nodes
      const inputData = this.collectNodeInputs(node);
      
      // Create execution context
      const context: NodeExecutionContext = {
        nodeId: node.id,
        workflowRunId: this.workflowRun.id,
        inputData,
        variables: this.workflow.variables,
        services: this.services
      };

      // Get executor for this node type
      const executor = await this.executorRegistry.getExecutor(node.nodeType);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.nodeType}`);
      }

      // Execute the node
      const startTime = Date.now();
      const result = await executor.execute(node, context);
      const executionTime = Date.now() - startTime;

      if (result.success) {
        this.nodeStatuses.set(node.id, 'completed');
        this.nodeOutputs.set(node.id, result.data);
      } else {
        this.nodeStatuses.set(node.id, 'error');
        
        // Handle error based on workflow settings
        if (this.workflow.settings.errorStrategy === 'stop') {
          throw new Error(`Node ${node.title} failed: ${result.error}`);
        }
      }

    } catch (error) {
      this.nodeStatuses.set(node.id, 'error');
      
      if (this.workflow.settings.errorStrategy === 'stop') {
        throw error;
      }
    }
  }

  private collectNodeInputs(node: WorkflowNode): any {
    const inputs: any = {};
    
    // Find all connections targeting this node
    const incomingConnections = this.workflow.connections.filter(
      conn => conn.targetNodeId === node.id
    );

    for (const connection of incomingConnections) {
      const sourceOutput = this.nodeOutputs.get(connection.sourceNodeId);
      if (sourceOutput) {
        // Map output port to input port
        inputs[connection.targetPort] = sourceOutput[connection.sourcePort] || sourceOutput;
      }
    }

    return inputs;
  }

  private findStartNodes(): WorkflowNode[] {
    return this.workflow.nodes.filter(node => {
      const hasIncomingConnections = this.workflow.connections.some(
        conn => conn.targetNodeId === node.id
      );
      return !hasIncomingConnections || node.type === 'start';
    });
  }

  private findOutputNodes(): WorkflowNode[] {
    return this.workflow.nodes.filter(node => {
      const hasOutgoingConnections = this.workflow.connections.some(
        conn => conn.sourceNodeId === node.id
      );
      return !hasOutgoingConnections || node.type === 'output';
    });
  }

  private getExecutionOrder(): string[] {
    // Topological sort to determine execution order
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error('Circular dependency detected in workflow');
      }
      
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);

      // Visit all dependencies first
      const dependencies = this.workflow.connections
        .filter(conn => conn.targetNodeId === nodeId)
        .map(conn => conn.sourceNodeId);

      for (const depId of dependencies) {
        visit(depId);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    // Start with all nodes
    for (const node of this.workflow.nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return result;
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    this.workflowRun.status = 'cancelled';
  }

  getRunStatus(): WorkflowRun {
    return { ...this.workflowRun };
  }
}

// Singleton instance
export const workflowEngine = new WorkflowExecutionEngine();