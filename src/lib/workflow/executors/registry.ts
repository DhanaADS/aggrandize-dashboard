// Node Executor Registry
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult } from '../types';

export abstract class BaseNodeExecutor {
  abstract execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult>;
  
  protected createResult(success: boolean, data: any, error?: string, executionTime = 0): NodeExecutionResult {
    return {
      success,
      data,
      error,
      executionTime,
      outputPorts: { main: data }
    };
  }

  protected validateInputs(inputs: any, required: string[]): void {
    for (const field of required) {
      if (!inputs[field]) {
        throw new Error(`Required input '${field}' is missing`);
      }
    }
  }
}

export class NodeExecutorRegistry {
  private executors: Map<string, BaseNodeExecutor> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.registerDefaultExecutors();
  }

  registerExecutor(nodeType: string, executor: BaseNodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  async getExecutor(nodeType: string): Promise<BaseNodeExecutor | undefined> {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
    return this.executors.get(nodeType);
  }

  getExecutorSync(nodeType: string): BaseNodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  private registerDefaultExecutors(): void {
    // Register all default executors directly with lazy imports
    this.initPromise = this.lazyRegisterExecutors();
  }

  private async lazyRegisterExecutors(): Promise<void> {
    try {
      // Import and register executors
      const [
        { HttpRequestExecutor },
        { SerpScraperExecutor },
        { KeywordResearchExecutor },
        { PageAnalyzerExecutor },
        { ContentWriterExecutor },
        { DatabaseWriteExecutor },
        { CSVExportExecutor }
      ] = await Promise.all([
        import('./http-request'),
        import('./serp-scraper'),
        import('./keyword-research'),
        import('./page-analyzer'),
        import('./content-writer'),
        import('./database-write'),
        import('./csv-export')
      ]);

      // Source nodes
      this.registerExecutor('http-request', new HttpRequestExecutor());
      this.registerExecutor('serp-scraper', new SerpScraperExecutor());
      this.registerExecutor('keyword-research', new KeywordResearchExecutor());
      
      // SEO nodes
      this.registerExecutor('page-analyzer', new PageAnalyzerExecutor());
      this.registerExecutor('rank-tracker', new RankTrackerExecutor());
      this.registerExecutor('site-audit', new SiteAuditExecutor());
      
      // AI nodes
      this.registerExecutor('gpt4-agent', new GPT4AgentExecutor());
      this.registerExecutor('claude-agent', new ClaudeAgentExecutor());
      this.registerExecutor('content-writer', new ContentWriterExecutor());
      this.registerExecutor('seo-optimizer', new SEOOptimizerExecutor());
      
      // Process nodes
      this.registerExecutor('content-extractor', new ContentExtractorExecutor());
      this.registerExecutor('text-cleaner', new TextCleanerExecutor());
      this.registerExecutor('data-merger', new DataMergerExecutor());
      
      // Filter nodes
      this.registerExecutor('keyword-filter', new KeywordFilterExecutor());
      this.registerExecutor('ranking-filter', new RankingFilterExecutor());
      
      // Output nodes
      this.registerExecutor('database-write', new DatabaseWriteExecutor());
      this.registerExecutor('csv-export', new CSVExportExecutor());
      this.registerExecutor('api-webhook', new APIWebhookExecutor());
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to register workflow executors:', error);
    }
  }
}

// Stub classes - will be implemented in separate files
class RankTrackerExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Rank tracking not implemented yet' });
  }
}

class SiteAuditExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Site audit not implemented yet' });
  }
}

class GPT4AgentExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'GPT-4 agent not implemented yet' });
  }
}

class ClaudeAgentExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Claude agent not implemented yet' });
  }
}

class SEOOptimizerExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'SEO optimizer not implemented yet' });
  }
}

class ContentExtractorExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Content extractor not implemented yet' });
  }
}

class TextCleanerExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Text cleaner not implemented yet' });
  }
}

class DataMergerExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Data merger not implemented yet' });
  }
}

class KeywordFilterExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Keyword filter not implemented yet' });
  }
}

class RankingFilterExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'Ranking filter not implemented yet' });
  }
}

class APIWebhookExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    return this.createResult(true, { message: 'API webhook not implemented yet' });
  }
}