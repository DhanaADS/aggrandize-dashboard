/**
 * Template Management System - Smart Template Creation, Storage, and Reuse
 * Manages extraction templates with automatic optimization and learning
 */

import { GeneratedSchema, SchemaTemplate, schemaGenerator } from './schema-generator';
import { ContentAnalysis } from './content-detector';
import { QualityScore } from './quality-analyzer';

export interface TemplateUsage {
  templateId: string;
  usedAt: string;
  domain: string;
  success: boolean;
  extractedFields: number;
  accuracy: number;
  processingTime: number;
  feedback?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TemplatePerformance {
  templateId: string;
  totalUsage: number;
  successRate: number;
  averageAccuracy: number;
  averageProcessingTime: number;
  popularDomains: string[];
  recentPerformance: number;
  trend: 'improving' | 'stable' | 'declining';
  lastOptimized: string;
}

export interface AutoLearningResult {
  optimizedTemplate: SchemaTemplate;
  improvements: string[];
  performanceGain: number;
  confidence: number;
}

class TemplateManager {
  private templates = new Map<string, SchemaTemplate>();
  private usageHistory: TemplateUsage[] = [];
  private performanceCache = new Map<string, TemplatePerformance>();
  
  constructor() {
    this.initializeDefaultTemplates();
    this.startPerformanceAnalysis();
  }

  // Create and save new template from schema
  async createTemplate(
    schema: GeneratedSchema,
    name: string,
    description?: string
  ): Promise<SchemaTemplate> {
    
    console.log(`📝 Creating new template: ${name}`);
    
    const template: SchemaTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      contentType: schema.contentType,
      description: description || `Template for ${schema.contentType.replace('_', ' ')} content`,
      fields: schema.fields.map(field => ({
        ...field,
        confidence: Math.min(field.confidence + 0.1, 1.0) // Boost confidence for user-created templates
      })),
      industry: schema.metadata.industry,
      usageCount: 0,
      successRate: schema.performance.estimatedAccuracy,
      lastUpdated: new Date().toISOString()
    };
    
    this.templates.set(template.id, template);
    
    // Initialize performance tracking
    this.performanceCache.set(template.id, {
      templateId: template.id,
      totalUsage: 0,
      successRate: template.successRate,
      averageAccuracy: template.successRate,
      averageProcessingTime: 0,
      popularDomains: [],
      recentPerformance: template.successRate,
      trend: 'stable',
      lastOptimized: new Date().toISOString()
    });
    
    console.log(`✅ Template created successfully: ${template.id}`);
    return template;
  }

  // Find best template for content type and domain
  async findBestTemplate(
    contentAnalysis: ContentAnalysis,
    domain: string,
    requirements?: {
      requiredFields?: string[];
      maxComplexity?: 'low' | 'medium' | 'high';
      minSuccessRate?: number;
    }
  ): Promise<{ template: SchemaTemplate; confidence: number; reason: string } | null> {
    
    console.log(`🔍 Finding best template for ${contentAnalysis.primaryType.type} on ${domain}`);
    
    const contentType = contentAnalysis.primaryType.type;
    const candidates = Array.from(this.templates.values())
      .filter(template => template.contentType === contentType);
    
    if (candidates.length === 0) {
      console.log(`❌ No templates found for content type: ${contentType}`);
      return null;
    }
    
    // Score templates based on multiple factors
    const scoredTemplates = candidates.map(template => {
      let score = 0;
      const reasons: string[] = [];
      
      // Base success rate (40% weight)
      score += template.successRate * 0.4;
      reasons.push(`${(template.successRate * 100).toFixed(1)}% success rate`);
      
      // Usage count indicates reliability (20% weight)
      const usageScore = Math.min(template.usageCount / 100, 1) * 0.2;
      score += usageScore;
      if (template.usageCount > 0) {
        reasons.push(`${template.usageCount} previous uses`);
      }
      
      // Domain-specific performance (20% weight)
      const performance = this.performanceCache.get(template.id);
      if (performance) {
        const domainFamiliarity = performance.popularDomains.includes(domain) ? 0.2 : 0;
        score += domainFamiliarity;
        if (domainFamiliarity > 0) {
          reasons.push(`Previous success on ${domain}`);
        }
        
        // Recent performance trend (10% weight)
        const trendScore = performance.trend === 'improving' ? 0.1 : 
                          performance.trend === 'stable' ? 0.05 : 0;
        score += trendScore;
        if (trendScore > 0) {
          reasons.push(`${performance.trend} performance trend`);
        }
      }
      
      // Field coverage (10% weight)
      if (requirements?.requiredFields) {
        const templateFields = template.fields.map(f => f.name);
        const coverageScore = requirements.requiredFields.filter(field => 
          templateFields.includes(field)
        ).length / requirements.requiredFields.length;
        score += coverageScore * 0.1;
        
        if (coverageScore > 0.8) {
          reasons.push('Covers all required fields');
        }
      }
      
      // Apply requirements filters
      if (requirements?.minSuccessRate && template.successRate < requirements.minSuccessRate) {
        score = 0; // Disqualify
        reasons.push('Below minimum success rate');
      }
      
      return {
        template,
        score,
        reasons: reasons.join(', ')
      };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    if (scoredTemplates.length === 0) {
      console.log(`❌ No suitable templates found matching requirements`);
      return null;
    }
    
    const best = scoredTemplates[0];
    console.log(`🎯 Selected template: ${best.template.name} (score: ${best.score.toFixed(2)})`);
    console.log(`📋 Reasons: ${best.reasons}`);
    
    return {
      template: best.template,
      confidence: best.score,
      reason: best.reasons
    };
  }

  // Record template usage and performance
  recordUsage(
    templateId: string,
    domain: string,
    success: boolean,
    extractedFields: number,
    accuracy: number,
    processingTime: number,
    feedback?: 'excellent' | 'good' | 'fair' | 'poor'
  ): void {
    
    const usage: TemplateUsage = {
      templateId,
      usedAt: new Date().toISOString(),
      domain,
      success,
      extractedFields,
      accuracy,
      processingTime,
      feedback
    };
    
    this.usageHistory.push(usage);
    
    // Update template statistics
    const template = this.templates.get(templateId);
    if (template) {
      template.usageCount++;
      template.lastUpdated = new Date().toISOString();
      
      // Update success rate (weighted average)
      const weight = 0.1; // How much new data affects the average
      template.successRate = (template.successRate * (1 - weight)) + (accuracy * weight);
    }
    
    // Update performance cache
    this.updatePerformanceMetrics(templateId, usage);
    
    console.log(`📊 Recorded template usage: ${templateId} - Success: ${success}, Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  }

  // Auto-optimize templates based on usage data
  async optimizeTemplate(templateId: string): Promise<AutoLearningResult | null> {
    console.log(`🚀 Optimizing template: ${templateId}`);
    
    const template = this.templates.get(templateId);
    if (!template) return null;
    
    const usageData = this.usageHistory.filter(usage => usage.templateId === templateId);
    if (usageData.length < 10) {
      console.log(`❌ Insufficient usage data for optimization (${usageData.length} records)`);
      return null;
    }
    
    const improvements: string[] = [];
    let performanceGain = 0;
    
    // Analyze field performance
    const fieldPerformance = this.analyzeFieldPerformance(templateId, usageData);
    
    // Remove consistently failing fields
    const failingFields = fieldPerformance.filter(fp => fp.successRate < 0.3);
    if (failingFields.length > 0) {
      template.fields = template.fields.filter(field => 
        !failingFields.some(ff => ff.fieldName === field.name)
      );
      improvements.push(`Removed ${failingFields.length} consistently failing fields`);
      performanceGain += 0.1;
    }
    
    // Adjust field confidence based on actual performance
    fieldPerformance.forEach(fp => {
      const field = template.fields.find(f => f.name === fp.fieldName);
      if (field) {
        const oldConfidence = field.confidence;
        field.confidence = (field.confidence * 0.7) + (fp.successRate * 0.3);
        
        if (Math.abs(field.confidence - oldConfidence) > 0.1) {
          improvements.push(`Adjusted confidence for ${field.name}: ${oldConfidence.toFixed(2)} → ${field.confidence.toFixed(2)}`);
          performanceGain += 0.05;
        }
      }
    });
    
    // Reorder fields by performance
    template.fields.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return b.confidence - a.confidence;
    });
    
    // Update template metadata
    template.lastUpdated = new Date().toISOString();
    template.successRate = usageData.reduce((sum, usage) => sum + usage.accuracy, 0) / usageData.length;
    
    // Update performance cache
    const performance = this.performanceCache.get(templateId);
    if (performance) {
      performance.lastOptimized = new Date().toISOString();
      performance.trend = performanceGain > 0.05 ? 'improving' : 'stable';
    }
    
    console.log(`✅ Template optimization complete: ${improvements.length} improvements, ${(performanceGain * 100).toFixed(1)}% gain`);
    
    return {
      optimizedTemplate: template,
      improvements,
      performanceGain,
      confidence: Math.min(template.successRate + performanceGain, 1.0)
    };
  }

  // Analyze field-level performance
  private analyzeFieldPerformance(templateId: string, usageData: TemplateUsage[]): Array<{
    fieldName: string;
    successRate: number;
    averageAccuracy: number;
    usageCount: number;
  }> {
    
    const template = this.templates.get(templateId);
    if (!template) return [];
    
    return template.fields.map(field => {
      // In a real implementation, you'd track field-level success
      // For now, we'll simulate based on field confidence and type
      const baseSuccess = field.confidence;
      const typeMultiplier = field.type === 'text' ? 1.0 : 
                            field.type === 'date' ? 0.85 :
                            field.type === 'array' ? 0.75 : 0.9;
      
      const successRate = Math.min(baseSuccess * typeMultiplier, 1.0);
      
      return {
        fieldName: field.name,
        successRate,
        averageAccuracy: successRate,
        usageCount: usageData.length
      };
    });
  }

  // Update performance metrics
  private updatePerformanceMetrics(templateId: string, usage: TemplateUsage): void {
    let performance = this.performanceCache.get(templateId);
    
    if (!performance) {
      performance = {
        templateId,
        totalUsage: 0,
        successRate: 0,
        averageAccuracy: 0,
        averageProcessingTime: 0,
        popularDomains: [],
        recentPerformance: 0,
        trend: 'stable',
        lastOptimized: new Date().toISOString()
      };
    }
    
    // Update metrics
    performance.totalUsage++;
    
    // Weighted averages
    const weight = 1 / performance.totalUsage;
    performance.successRate = (performance.successRate * (1 - weight)) + (usage.success ? 1 : 0) * weight;
    performance.averageAccuracy = (performance.averageAccuracy * (1 - weight)) + (usage.accuracy * weight);
    performance.averageProcessingTime = (performance.averageProcessingTime * (1 - weight)) + (usage.processingTime * weight);
    
    // Update popular domains
    if (!performance.popularDomains.includes(usage.domain)) {
      performance.popularDomains.push(usage.domain);
      // Keep only top 10 domains
      if (performance.popularDomains.length > 10) {
        performance.popularDomains = performance.popularDomains.slice(-10);
      }
    }
    
    // Calculate recent performance (last 10 uses)
    const recentUsage = this.usageHistory
      .filter(u => u.templateId === templateId)
      .slice(-10);
    
    if (recentUsage.length > 0) {
      performance.recentPerformance = recentUsage.reduce((sum, u) => sum + u.accuracy, 0) / recentUsage.length;
      
      // Determine trend
      if (recentUsage.length >= 5) {
        const firstHalf = recentUsage.slice(0, Math.floor(recentUsage.length / 2));
        const secondHalf = recentUsage.slice(Math.floor(recentUsage.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, u) => sum + u.accuracy, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, u) => sum + u.accuracy, 0) / secondHalf.length;
        
        const difference = secondAvg - firstAvg;
        performance.trend = difference > 0.05 ? 'improving' : 
                           difference < -0.05 ? 'declining' : 'stable';
      }
    }
    
    this.performanceCache.set(templateId, performance);
  }

  // Get template recommendations for a domain
  getRecommendationsForDomain(domain: string, limit: number = 5): Array<{
    template: SchemaTemplate;
    reason: string;
    confidence: number;
  }> {
    
    const recommendations: Array<{
      template: SchemaTemplate;
      reason: string;
      confidence: number;
    }> = [];
    
    // Get domain usage history
    const domainUsage = this.usageHistory.filter(usage => usage.domain === domain);
    const domainContentTypes = [...new Set(domainUsage.map(usage => {
      const template = this.templates.get(usage.templateId);
      return template?.contentType;
    }))].filter(Boolean);
    
    // Recommend successful templates for this domain
    domainUsage.forEach(usage => {
      if (usage.success && usage.accuracy > 0.8) {
        const template = this.templates.get(usage.templateId);
        if (template && !recommendations.some(r => r.template.id === template.id)) {
          recommendations.push({
            template,
            reason: `Previously successful on ${domain} (${(usage.accuracy * 100).toFixed(1)}% accuracy)`,
            confidence: usage.accuracy
          });
        }
      }
    });
    
    // Recommend high-performing templates for content types used on this domain
    if (domainContentTypes.length > 0) {
      Array.from(this.templates.values())
        .filter(template => domainContentTypes.includes(template.contentType))
        .filter(template => !recommendations.some(r => r.template.id === template.id))
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3)
        .forEach(template => {
          recommendations.push({
            template,
            reason: `High-performing template for ${template.contentType} content`,
            confidence: template.successRate
          });
        });
    }
    
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // Initialize default high-quality templates
  private initializeDefaultTemplates(): void {
    const defaultTemplates = schemaGenerator.getTemplates();
    
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
    
    console.log(`📚 Initialized ${defaultTemplates.length} default templates`);
  }

  // Start periodic performance analysis
  private startPerformanceAnalysis(): void {
    // Run optimization checks every 6 hours
    setInterval(() => {
      this.performPeriodicOptimization();
    }, 6 * 60 * 60 * 1000);
  }

  // Perform periodic optimization on active templates
  private async performPeriodicOptimization(): void {
    console.log(`🔄 Starting periodic template optimization...`);
    
    const activeTemplates = Array.from(this.performanceCache.entries())
      .filter(([_, performance]) => performance.totalUsage >= 10)
      .sort(([_, a], [__, b]) => b.totalUsage - a.totalUsage)
      .slice(0, 5); // Optimize top 5 active templates
    
    for (const [templateId] of activeTemplates) {
      try {
        await this.optimizeTemplate(templateId);
      } catch (error) {
        console.error(`❌ Failed to optimize template ${templateId}:`, error);
      }
    }
    
    console.log(`✅ Periodic optimization complete`);
  }

  // Get all templates
  getAllTemplates(): SchemaTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  // Get template by ID
  getTemplate(templateId: string): SchemaTemplate | null {
    return this.templates.get(templateId) || null;
  }

  // Delete template
  deleteTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.performanceCache.delete(templateId);
      console.log(`🗑️ Deleted template: ${templateId}`);
    }
    return deleted;
  }

  // Get performance analytics
  getPerformanceAnalytics(): {
    totalTemplates: number;
    activeTemplates: number;
    averageSuccessRate: number;
    topPerformingTemplates: Array<{
      template: SchemaTemplate;
      performance: TemplatePerformance;
    }>;
    recentOptimizations: number;
  } {
    
    const performances = Array.from(this.performanceCache.values());
    const activeTemplates = performances.filter(p => p.totalUsage > 0);
    
    const averageSuccessRate = activeTemplates.length > 0 ?
      activeTemplates.reduce((sum, p) => sum + p.successRate, 0) / activeTemplates.length : 0;
    
    const topPerformingTemplates = performances
      .filter(p => p.totalUsage >= 5)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
      .map(performance => ({
        template: this.templates.get(performance.templateId)!,
        performance
      }))
      .filter(item => item.template);
    
    const recentOptimizations = performances.filter(p => {
      const daysSinceOptimization = (Date.now() - new Date(p.lastOptimized).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceOptimization <= 7;
    }).length;
    
    return {
      totalTemplates: this.templates.size,
      activeTemplates: activeTemplates.length,
      averageSuccessRate,
      topPerformingTemplates,
      recentOptimizations
    };
  }
}

// Export singleton instance
export const templateManager = new TemplateManager();