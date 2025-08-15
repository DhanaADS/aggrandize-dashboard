// Keyword Research Node Executor
import { BaseNodeExecutor } from './registry';
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult, KeywordData } from '../types';

export class KeywordResearchExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { 
        seedKeywords,
        location = 'US',
        language = 'en',
        includeRelated = true,
        maxResults = 100,
        minSearchVolume = 0,
        maxDifficulty = 100
      } = node.properties;
      
      if (!seedKeywords || !Array.isArray(seedKeywords) || seedKeywords.length === 0) {
        throw new Error('Seed keywords array is required for Keyword Research node');
      }

      // Generate keyword data for each seed keyword
      const allKeywords: KeywordData[] = [];
      
      for (const seedKeyword of seedKeywords) {
        const keywordData = await this.researchKeyword(seedKeyword, location, language);
        allKeywords.push(keywordData);
        
        // Get related keywords if requested
        if (includeRelated) {
          const relatedKeywords = await this.getRelatedKeywords(
            seedKeyword, 
            location, 
            language,
            Math.min(10, Math.floor(maxResults / seedKeywords.length))
          );
          allKeywords.push(...relatedKeywords);
        }
      }

      // Filter based on criteria
      const filteredKeywords = allKeywords.filter(kw => 
        kw.searchVolume >= minSearchVolume && 
        kw.difficulty <= maxDifficulty
      );

      // Sort by search volume descending
      const sortedKeywords = filteredKeywords
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, maxResults);

      const executionTime = Date.now() - startTime;

      return this.createResult(
        true,
        {
          seedKeywords,
          location,
          language,
          totalKeywords: sortedKeywords.length,
          keywords: sortedKeywords,
          researchedAt: new Date().toISOString(),
          filters: {
            minSearchVolume,
            maxDifficulty,
            maxResults
          }
        },
        undefined,
        executionTime
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return this.createResult(
        false, 
        {}, 
        error instanceof Error ? error.message : 'Unknown error',
        executionTime
      );
    }
  }

  private async researchKeyword(
    keyword: string, 
    location: string, 
    language: string
  ): Promise<KeywordData> {
    // In production, integrate with SEMrush, Ahrefs, or similar API
    // For now, simulate realistic keyword data
    
    const baseVolume = Math.floor(Math.random() * 10000) + 100;
    const difficulty = Math.floor(Math.random() * 100) + 1;
    
    return {
      keyword,
      searchVolume: baseVolume,
      difficulty,
      cpc: parseFloat((Math.random() * 5 + 0.1).toFixed(2)),
      competition: difficulty > 70 ? 'high' : difficulty > 40 ? 'medium' : 'low',
      intent: this.determineIntent(keyword),
      relatedKeywords: []
    };
  }

  private async getRelatedKeywords(
    seedKeyword: string,
    location: string,
    language: string,
    count: number
  ): Promise<KeywordData[]> {
    const relatedKeywords: KeywordData[] = [];
    
    // Generate related keyword variations
    const variations = [
      `${seedKeyword} guide`,
      `${seedKeyword} tips`,
      `${seedKeyword} best`,
      `${seedKeyword} how to`,
      `${seedKeyword} free`,
      `${seedKeyword} online`,
      `${seedKeyword} tool`,
      `${seedKeyword} service`,
      `${seedKeyword} software`,
      `${seedKeyword} review`
    ];

    for (let i = 0; i < Math.min(count, variations.length); i++) {
      const relatedKeyword = await this.researchKeyword(
        variations[i], 
        location, 
        language
      );
      relatedKeywords.push(relatedKeyword);
    }

    return relatedKeywords;
  }

  private determineIntent(keyword: string): string {
    const lowerKeyword = keyword.toLowerCase();
    
    if (lowerKeyword.includes('buy') || lowerKeyword.includes('price') || 
        lowerKeyword.includes('cost') || lowerKeyword.includes('purchase')) {
      return 'commercial';
    }
    
    if (lowerKeyword.includes('how to') || lowerKeyword.includes('what is') || 
        lowerKeyword.includes('guide') || lowerKeyword.includes('tutorial')) {
      return 'informational';
    }
    
    if (lowerKeyword.includes('best') || lowerKeyword.includes('top') || 
        lowerKeyword.includes('review') || lowerKeyword.includes('compare')) {
      return 'commercial';
    }
    
    if (lowerKeyword.includes('near me') || lowerKeyword.includes('location') || 
        lowerKeyword.includes('store')) {
      return 'local';
    }
    
    return 'informational';
  }
}