// Database Service Implementation
import { DatabaseService } from '../types';
import { createClient } from '@/lib/supabase/client';

export class DatabaseServiceImpl implements DatabaseService {
  private supabase = createClient();

  async query(sql: string, params?: any[]): Promise<any[]> {
    try {
      // Note: Supabase doesn't support raw SQL queries directly from client
      // This would need to be implemented via RPC functions or API endpoints
      throw new Error('Raw SQL queries not supported in client-side Supabase');
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(
    table: string, 
    data: Record<string, any>, 
    where: Record<string, any>
  ): Promise<any> {
    try {
      let query = this.supabase.from(table).update(data);

      // Apply where conditions
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value);
      }

      const { data: result, error } = await query.select();

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(table: string, where: Record<string, any>): Promise<any> {
    try {
      let query = this.supabase.from(table).delete();

      // Apply where conditions
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value);
      }

      const { data: result, error } = await query.select();

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bulkInsert(table: string, data: Record<string, any>[]): Promise<any> {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw new Error(`Bulk insert failed: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Bulk insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Additional helper methods for common SEO data operations
  async saveKeywords(projectId: string, keywords: any[]): Promise<any> {
    const keywordRecords = keywords.map(kw => ({
      project_id: projectId,
      keyword: kw.keyword,
      search_volume: kw.searchVolume,
      keyword_difficulty: kw.difficulty,
      cpc: kw.cpc,
      competition_level: kw.competition,
      search_intent: kw.intent,
      language: kw.language || 'en',
      country: kw.country || 'US'
    }));

    return this.bulkInsert('seo_keywords', keywordRecords);
  }

  async saveRankings(keywordId: string, rankings: any[]): Promise<any> {
    const rankingRecords = rankings.map(rank => ({
      keyword_id: keywordId,
      url: rank.url,
      position: rank.position,
      search_engine: rank.searchEngine || 'google',
      location: rank.location,
      device: rank.device || 'desktop',
      serp_features: rank.features || []
    }));

    return this.bulkInsert('seo_rankings', rankingRecords);
  }

  async saveContentAnalysis(projectId: string, analysis: any): Promise<any> {
    const contentRecord = {
      project_id: projectId,
      url: analysis.url,
      title: analysis.title,
      meta_description: analysis.metaDescription,
      h1_tags: analysis.h1Tags,
      h2_tags: analysis.h2Tags,
      word_count: analysis.wordCount,
      content_hash: this.generateContentHash(analysis.title + analysis.metaDescription),
      schema_markup: analysis.schema || [],
      internal_links: analysis.internalLinks,
      external_links: analysis.externalLinks,
      images_count: analysis.images,
      page_speed_score: analysis.loadTime
    };

    return this.insert('seo_content', contentRecord);
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content fingerprinting
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
}