// Workflow Execution Engine Types
export interface WorkflowNode {
  id: string;
  type: 'start' | 'source' | 'seo' | 'filter' | 'process' | 'ai' | 'output';
  nodeType: string;
  title: string;
  position: { x: number; y: number };
  properties: Record<string, unknown>;
  status: 'idle' | 'running' | 'completed' | 'error' | 'skipped';
}

export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  variables: Record<string, unknown>;
  settings: {
    maxRetries: number;
    timeout: number;
    parallelExecution: boolean;
    errorStrategy: 'stop' | 'continue' | 'retry';
  };
}

export interface NodeExecutionContext {
  nodeId: string;
  workflowRunId: string;
  inputData: unknown;
  variables: Record<string, unknown>;
  services: {
    http: HttpService;
    ai: AIService;
    database: DatabaseService;
    seo: SEOService;
  };
}

export interface NodeExecutionResult {
  success: boolean;
  data: unknown;
  error?: string;
  executionTime: number;
  outputPorts: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerType: 'manual' | 'scheduled' | 'webhook' | 'api';
  startedAt: Date;
  completedAt?: Date;
  inputData: unknown;
  outputData: unknown;
  error?: string;
  progress: {
    completedNodes: number;
    totalNodes: number;
    currentStep: string;
  };
}

// Service interfaces
export interface HttpService {
  get(url: string, options?: HttpOptions): Promise<unknown>;
  post(url: string, data: unknown, options?: HttpOptions): Promise<unknown>;
  put(url: string, data: unknown, options?: HttpOptions): Promise<unknown>;
  delete(url: string, options?: HttpOptions): Promise<unknown>;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
  timeout?: number;
  retries?: number;
  proxy?: string;
}

export interface AIService {
  generateContent(prompt: string, model: string, options?: AIOptions): Promise<string>;
  analyzeContent(content: string, task: string, model: string): Promise<Record<string, unknown>>;
  extractKeywords(content: string, count?: number): Promise<string[]>;
  optimizeContent(content: string, target: string): Promise<string>;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  format?: 'text' | 'json' | 'markdown';
}

export interface DatabaseService {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  insert(table: string, data: Record<string, unknown>): Promise<unknown>;
  update(table: string, data: Record<string, unknown>, where: Record<string, unknown>): Promise<unknown>;
  delete(table: string, where: Record<string, unknown>): Promise<unknown>;
  bulkInsert(table: string, data: Record<string, unknown>[]): Promise<unknown>;
}

export interface SEOService {
  analyzeKeywords(keywords: string[], location?: string): Promise<KeywordData[]>;
  scrapeSerp(query: string, location?: string, device?: string): Promise<SerpResult[]>;
  analyzeContent(url: string): Promise<ContentAnalysis>;
  checkBacklinks(domain: string): Promise<BacklinkData[]>;
  auditSite(domain: string): Promise<SiteAudit>;
  trackRankings(keywords: string[], domain: string): Promise<RankingData[]>;
}

// SEO Data Types
export interface KeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  competition: string;
  intent: string;
  relatedKeywords: string[];
}

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
  domain: string;
  features: string[];
}

export interface ContentAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  schema: Record<string, unknown>[];
  loadTime: number;
  mobileOptimized: boolean;
  seoScore: number;
}

export interface BacklinkData {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  linkType: 'dofollow' | 'nofollow';
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface RankingData {
  keyword: string;
  position: number;
  url: string;
  searchEngine: string;
  location: string;
  device: string;
  features: string[];
  checkedAt: Date;
}

export interface SiteAudit {
  domain: string;
  crawledPages: number;
  issues: {
    critical: AuditIssue[];
    high: AuditIssue[];
    medium: AuditIssue[];
    low: AuditIssue[];
  };
  metrics: {
    loadTime: number;
    mobileScore: number;
    seoScore: number;
    accessibility: number;
  };
  auditedAt: Date;
}

export interface AuditIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  urls: string[];
  recommendation: string;
}