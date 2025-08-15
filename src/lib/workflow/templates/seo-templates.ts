// Pre-built SEO Workflow Templates
import { WorkflowDefinition } from '../types';

export const seoWorkflowTemplates: Record<string, WorkflowDefinition> = {
  keywordResearch: {
    id: 'keyword-research-template',
    name: 'Keyword Research & Analysis',
    description: 'Comprehensive keyword research workflow with competitor analysis and content gap identification',
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
        id: 'keyword-research-1',
        type: 'source',
        nodeType: 'keyword-research',
        title: 'Keyword Research',
        position: { x: 400, y: 200 },
        properties: {
          seedKeywords: ['SEO', 'digital marketing', 'content optimization'],
          location: 'US',
          language: 'en',
          includeRelated: true,
          maxResults: 50,
          minSearchVolume: 100,
          maxDifficulty: 80
        },
        status: 'idle'
      },
      {
        id: 'competitor-analysis-1',
        type: 'seo',
        nodeType: 'competitor-analysis',
        title: 'Competitor Analysis',
        position: { x: 600, y: 300 },
        properties: {
          competitors: ['semrush.com', 'ahrefs.com', 'moz.com'],
          analysisDepth: 'comprehensive'
        },
        status: 'idle'
      },
      {
        id: 'content-gaps-1',
        type: 'seo',
        nodeType: 'content-gaps',
        title: 'Content Gap Analysis',
        position: { x: 800, y: 200 },
        properties: {
          minGapScore: 70,
          maxCompetitors: 5
        },
        status: 'idle'
      },
      {
        id: 'csv-export-1',
        type: 'output',
        nodeType: 'csv-export',
        title: 'Export Results',
        position: { x: 1000, y: 200 },
        properties: {
          filename: 'keyword_research_results.csv',
          includeHeaders: true
        },
        status: 'idle'
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'start-1',
        targetNodeId: 'keyword-research-1',
        sourcePort: 'main',
        targetPort: 'input'
      },
      {
        id: 'conn-2',
        sourceNodeId: 'keyword-research-1',
        targetNodeId: 'competitor-analysis-1',
        sourcePort: 'main',
        targetPort: 'keywords'
      },
      {
        id: 'conn-3',
        sourceNodeId: 'keyword-research-1',
        targetNodeId: 'content-gaps-1',
        sourcePort: 'main',
        targetPort: 'keywords'
      },
      {
        id: 'conn-4',
        sourceNodeId: 'content-gaps-1',
        targetNodeId: 'csv-export-1',
        sourcePort: 'main',
        targetPort: 'data'
      }
    ],
    variables: {
      domain: 'example.com',
      targetLocation: 'United States'
    },
    settings: {
      maxRetries: 3,
      timeout: 600000,
      parallelExecution: true,
      errorStrategy: 'continue'
    }
  },

  contentOptimization: {
    id: 'content-optimization-template',
    name: 'AI-Powered Content Optimization',
    description: 'Analyze existing content and generate SEO-optimized versions using AI',
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
        id: 'http-request-1',
        type: 'source',
        nodeType: 'http-request',
        title: 'Fetch Content',
        position: { x: 400, y: 200 },
        properties: {
          method: 'GET',
          headers: {
            'User-Agent': 'SEO-Bot/1.0'
          }
        },
        status: 'idle'
      },
      {
        id: 'page-analyzer-1',
        type: 'seo',
        nodeType: 'page-analyzer',
        title: 'Analyze Page',
        position: { x: 600, y: 200 },
        properties: {
          includeImages: true,
          includeLinks: true,
          includeSchema: true
        },
        status: 'idle'
      },
      {
        id: 'seo-optimizer-1',
        type: 'ai',
        nodeType: 'seo-optimizer',
        title: 'SEO Optimizer',
        position: { x: 800, y: 200 },
        properties: {
          model: 'gpt-4',
          targetKeywords: ['content optimization', 'SEO best practices'],
          optimizationGoals: ['readability', 'keyword_density', 'meta_tags']
        },
        status: 'idle'
      },
      {
        id: 'content-writer-1',
        type: 'ai',
        nodeType: 'content-writer',
        title: 'Generate Optimized Content',
        position: { x: 1000, y: 200 },
        properties: {
          contentType: 'article',
          wordCount: 1500,
          tone: 'professional',
          model: 'gpt-4',
          includeOutline: true
        },
        status: 'idle'
      },
      {
        id: 'database-write-1',
        type: 'output',
        nodeType: 'database-write',
        title: 'Save Results',
        position: { x: 1200, y: 200 },
        properties: {
          table: 'seo_content',
          operation: 'insert'
        },
        status: 'idle'
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'start-1',
        targetNodeId: 'http-request-1',
        sourcePort: 'main',
        targetPort: 'input'
      },
      {
        id: 'conn-2',
        sourceNodeId: 'http-request-1',
        targetNodeId: 'page-analyzer-1',
        sourcePort: 'main',
        targetPort: 'content'
      },
      {
        id: 'conn-3',
        sourceNodeId: 'page-analyzer-1',
        targetNodeId: 'seo-optimizer-1',
        sourcePort: 'main',
        targetPort: 'analysis'
      },
      {
        id: 'conn-4',
        sourceNodeId: 'seo-optimizer-1',
        targetNodeId: 'content-writer-1',
        sourcePort: 'main',
        targetPort: 'requirements'
      },
      {
        id: 'conn-5',
        sourceNodeId: 'content-writer-1',
        targetNodeId: 'database-write-1',
        sourcePort: 'main',
        targetPort: 'data'
      }
    ],
    variables: {
      targetUrl: '',
      projectId: ''
    },
    settings: {
      maxRetries: 2,
      timeout: 900000,
      parallelExecution: false,
      errorStrategy: 'stop'
    }
  },

  rankTracking: {
    id: 'rank-tracking-template',
    name: 'Keyword Rank Tracking',
    description: 'Monitor keyword rankings across multiple search engines and locations',
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
        id: 'database-read-1',
        type: 'source',
        nodeType: 'database-read',
        title: 'Load Keywords',
        position: { x: 400, y: 200 },
        properties: {
          table: 'seo_keywords',
          query: 'SELECT * FROM seo_keywords WHERE project_id = $1',
          params: ['{{projectId}}']
        },
        status: 'idle'
      },
      {
        id: 'rank-tracker-1',
        type: 'seo',
        nodeType: 'rank-tracker',
        title: 'Track Rankings',
        position: { x: 600, y: 200 },
        properties: {
          searchEngines: ['google', 'bing'],
          locations: ['United States', 'United Kingdom'],
          devices: ['desktop', 'mobile']
        },
        status: 'idle'
      },
      {
        id: 'ranking-filter-1',
        type: 'filter',
        nodeType: 'ranking-filter',
        title: 'Filter Changes',
        position: { x: 800, y: 200 },
        properties: {
          significantChange: 5,
          onlyShowChanges: true
        },
        status: 'idle'
      },
      {
        id: 'database-write-1',
        type: 'output',
        nodeType: 'database-write',
        title: 'Save Rankings',
        position: { x: 1000, y: 200 },
        properties: {
          table: 'seo_rankings',
          operation: 'insert'
        },
        status: 'idle'
      },
      {
        id: 'email-report-1',
        type: 'output',
        nodeType: 'email-report',
        title: 'Email Report',
        position: { x: 1000, y: 300 },
        properties: {
          recipients: ['seo@company.com'],
          subject: 'Daily Ranking Report - {{date}}',
          template: 'ranking_changes'
        },
        status: 'idle'
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'start-1',
        targetNodeId: 'database-read-1',
        sourcePort: 'main',
        targetPort: 'input'
      },
      {
        id: 'conn-2',
        sourceNodeId: 'database-read-1',
        targetNodeId: 'rank-tracker-1',
        sourcePort: 'main',
        targetPort: 'keywords'
      },
      {
        id: 'conn-3',
        sourceNodeId: 'rank-tracker-1',
        targetNodeId: 'ranking-filter-1',
        sourcePort: 'main',
        targetPort: 'rankings'
      },
      {
        id: 'conn-4',
        sourceNodeId: 'ranking-filter-1',
        targetNodeId: 'database-write-1',
        sourcePort: 'main',
        targetPort: 'data'
      },
      {
        id: 'conn-5',
        sourceNodeId: 'ranking-filter-1',
        targetNodeId: 'email-report-1',
        sourcePort: 'main',
        targetPort: 'data'
      }
    ],
    variables: {
      projectId: '',
      domain: ''
    },
    settings: {
      maxRetries: 3,
      timeout: 1200000,
      parallelExecution: false,
      errorStrategy: 'continue'
    }
  },

  competitorMonitoring: {
    id: 'competitor-monitoring-template',
    name: 'Competitor Content Monitoring',
    description: 'Monitor competitor websites for new content and analyze their SEO strategies',
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
        id: 'sitemap-crawler-1',
        type: 'source',
        nodeType: 'sitemap-crawler',
        title: 'Crawl Competitor Sitemaps',
        position: { x: 400, y: 200 },
        properties: {
          sitemapUrls: [
            'https://competitor1.com/sitemap.xml',
            'https://competitor2.com/sitemap.xml'
          ],
          maxUrls: 100,
          filterByDate: true,
          daysSince: 7
        },
        status: 'idle'
      },
      {
        id: 'page-analyzer-1',
        type: 'seo',
        nodeType: 'page-analyzer',
        title: 'Analyze New Pages',
        position: { x: 600, y: 200 },
        properties: {
          includeImages: true,
          includeLinks: true,
          includeSchema: true
        },
        status: 'idle'
      },
      {
        id: 'keyword-extractor-1',
        type: 'ai',
        nodeType: 'keyword-generator',
        title: 'Extract Keywords',
        position: { x: 800, y: 200 },
        properties: {
          model: 'gpt-4',
          maxKeywords: 20,
          includeSemanticTerms: true
        },
        status: 'idle'
      },
      {
        id: 'content-gaps-1',
        type: 'seo',
        nodeType: 'content-gaps',
        title: 'Find Content Gaps',
        position: { x: 1000, y: 200 },
        properties: {
          ownDomain: '{{domain}}',
          gapThreshold: 0.7
        },
        status: 'idle'
      },
      {
        id: 'slack-notify-1',
        type: 'output',
        nodeType: 'slack-notify',
        title: 'Notify Team',
        position: { x: 1200, y: 200 },
        properties: {
          channel: '#seo-alerts',
          message: 'New competitor content detected: {{newPagesCount}} pages analyzed'
        },
        status: 'idle'
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'start-1',
        targetNodeId: 'sitemap-crawler-1',
        sourcePort: 'main',
        targetPort: 'input'
      },
      {
        id: 'conn-2',
        sourceNodeId: 'sitemap-crawler-1',
        targetNodeId: 'page-analyzer-1',
        sourcePort: 'main',
        targetPort: 'urls'
      },
      {
        id: 'conn-3',
        sourceNodeId: 'page-analyzer-1',
        targetNodeId: 'keyword-extractor-1',
        sourcePort: 'main',
        targetPort: 'content'
      },
      {
        id: 'conn-4',
        sourceNodeId: 'keyword-extractor-1',
        targetNodeId: 'content-gaps-1',
        sourcePort: 'main',
        targetPort: 'keywords'
      },
      {
        id: 'conn-5',
        sourceNodeId: 'content-gaps-1',
        targetNodeId: 'slack-notify-1',
        sourcePort: 'main',
        targetPort: 'data'
      }
    ],
    variables: {
      domain: 'yourdomain.com',
      competitors: []
    },
    settings: {
      maxRetries: 2,
      timeout: 1800000,
      parallelExecution: true,
      errorStrategy: 'continue'
    }
  }
};

export function getTemplateById(id: string): WorkflowDefinition | null {
  return seoWorkflowTemplates[id] || null;
}

export function getAllTemplates(): WorkflowDefinition[] {
  return Object.values(seoWorkflowTemplates);
}