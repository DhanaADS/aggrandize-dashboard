/**
 * Content Quality Analyzer - Intelligent Content Assessment and Scoring
 * Evaluates content quality, relevance, and extraction potential
 */

import { ContentAnalysis } from './content-detector';

export interface QualityScore {
  overall: number;
  breakdown: {
    completeness: number;
    structure: number;
    relevance: number;
    freshness: number;
    readability: number;
    extractability: number;
  };
  factors: {
    positive: string[];
    negative: string[];
    suggestions: string[];
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: 'extract' | 'skip' | 'review_manually';
}

export interface ContentFilter {
  minQualityScore: number;
  requiredFields: string[];
  blockedKeywords: string[];
  allowedDomains: string[];
  minWordCount: number;
  maxAge: number; // in days
  duplicateThreshold: number;
}

export interface DuplicateDetection {
  isDuplicate: boolean;
  similarityScore: number;
  duplicateOf: string[];
  uniqueContent: number; // percentage
}

class ContentQualityAnalyzer {
  private processedContent = new Map<string, { hash: string; url: string; title: string; timestamp: number }>();
  
  // Analyze content quality comprehensively
  analyzeQuality(
    content: string,
    url: string,
    contentAnalysis: ContentAnalysis,
    metadata: any = {}
  ): QualityScore {
    
    console.log(`📊 Analyzing content quality for: ${url}`);
    
    const breakdown = {
      completeness: this.assessCompleteness(content, contentAnalysis),
      structure: this.assessStructure(content, contentAnalysis),
      relevance: this.assessRelevance(content, url, metadata),
      freshness: this.assessFreshness(content, metadata),
      readability: this.assessReadability(content),
      extractability: this.assessExtractability(content, contentAnalysis)
    };
    
    // Calculate weighted overall score
    const weights = {
      completeness: 0.25,
      structure: 0.15,
      relevance: 0.20,
      freshness: 0.15,
      readability: 0.10,
      extractability: 0.15
    };
    
    const overall = Object.entries(breakdown)
      .reduce((sum, [key, value]) => sum + (value * weights[key as keyof typeof weights]), 0);
    
    const factors = this.generateQualityFactors(breakdown, content, contentAnalysis);
    const grade = this.calculateGrade(overall);
    const recommendation = this.generateRecommendation(overall, breakdown, contentAnalysis);
    
    console.log(`📈 Quality Score: ${(overall * 100).toFixed(1)}% (Grade ${grade})`);
    
    return {
      overall,
      breakdown,
      factors,
      grade,
      recommendation
    };
  }

  // Assess content completeness
  private assessCompleteness(content: string, analysis: ContentAnalysis): number {
    let score = 0.5; // Base score
    
    const cleanText = content.replace(/<[^>]+>/g, ' ').trim();
    const wordCount = cleanText.split(/\s+/).length;
    
    // Word count assessment
    if (wordCount >= 300) score += 0.3;
    else if (wordCount >= 150) score += 0.15;
    else if (wordCount < 50) score -= 0.3;
    
    // Essential elements present
    if (analysis.structure.title && analysis.structure.title.length > 10) score += 0.15;
    if (analysis.patterns.hasAuthor) score += 0.1;
    if (analysis.patterns.hasPublishDate) score += 0.1;
    if (analysis.patterns.hasCategories) score += 0.05;
    
    // Content type specific completeness
    const contentType = analysis.primaryType.type;
    switch (contentType) {
      case 'product_page':
        if (analysis.patterns.hasPrice) score += 0.15;
        if (analysis.patterns.hasRating) score += 0.1;
        if (analysis.patterns.hasSpecs) score += 0.1;
        break;
      case 'job_posting':
        if (content.toLowerCase().includes('salary') || content.toLowerCase().includes('compensation')) score += 0.1;
        if (content.toLowerCase().includes('requirements')) score += 0.1;
        break;
      case 'recipe':
        if (content.toLowerCase().includes('ingredients')) score += 0.15;
        if (content.toLowerCase().includes('instructions')) score += 0.1;
        break;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Assess content structure quality
  private assessStructure(content: string, analysis: ContentAnalysis): number {
    let score = 0.5;
    
    // Heading structure
    if (analysis.structure.headingLevels.length >= 2) score += 0.2;
    if (analysis.structure.headingLevels.length >= 4) score += 0.1;
    
    // Paragraph structure
    if (analysis.patterns.paragraphCount >= 3) score += 0.15;
    if (analysis.patterns.paragraphCount >= 5) score += 0.1;
    
    // HTML structure quality
    const hasSemanticElements = !!(
      content.includes('<article') || 
      content.includes('<section') || 
      content.includes('<main') ||
      content.includes('<header') ||
      content.includes('<nav')
    );
    
    if (hasSemanticElements) score += 0.15;
    
    // Content organization
    if (analysis.patterns.linkCount > 0 && analysis.patterns.linkCount < 20) score += 0.1;
    if (analysis.patterns.hasImages) score += 0.05;
    
    // Penalize poor structure
    if (analysis.patterns.paragraphCount < 2) score -= 0.2;
    if (analysis.structure.headingLevels.length === 0) score -= 0.15;
    
    return Math.max(0, Math.min(1, score));
  }

  // Assess content relevance and value
  private assessRelevance(content: string, url: string, metadata: any): number {
    let score = 0.7; // Base relevance score
    
    const lowerContent = content.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    // Check for high-value indicators
    const highValueKeywords = [
      'analysis', 'research', 'study', 'report', 'guide', 'tutorial', 
      'review', 'comparison', 'expert', 'professional', 'official'
    ];
    
    const lowValueKeywords = [
      'advertisement', 'sponsored', 'ad', 'promotion', 'affiliate',
      'placeholder', 'lorem ipsum', 'test', 'sample'
    ];
    
    // Positive relevance indicators
    const highValueMatches = highValueKeywords.filter(keyword => 
      lowerContent.includes(keyword) || lowerUrl.includes(keyword)
    ).length;
    score += Math.min(0.2, highValueMatches * 0.03);
    
    // Negative relevance indicators
    const lowValueMatches = lowValueKeywords.filter(keyword => 
      lowerContent.includes(keyword) || lowerUrl.includes(keyword)
    ).length;
    score -= Math.min(0.3, lowValueMatches * 0.1);
    
    // URL quality indicators
    if (lowerUrl.includes('blog') || lowerUrl.includes('article') || lowerUrl.includes('news')) {
      score += 0.05;
    }
    
    // Content depth indicators
    const sentences = content.split(/[.!?]+/).length;
    if (sentences > 10) score += 0.1;
    if (sentences > 20) score += 0.05;
    
    // Check for boilerplate content
    const boilerplateIndicators = [
      'cookie policy', 'privacy policy', 'terms of service',
      'subscribe to newsletter', 'follow us on social'
    ];
    
    const boilerplateMatches = boilerplateIndicators.filter(indicator => 
      lowerContent.includes(indicator)
    ).length;
    
    if (boilerplateMatches > 2) score -= 0.15;
    
    return Math.max(0, Math.min(1, score));
  }

  // Assess content freshness
  private assessFreshness(content: string, metadata: any): number {
    let score = 0.8; // Default freshness score
    
    // Try to extract publish date
    let publishDate: Date | null = null;
    
    if (metadata.publishDate) {
      publishDate = new Date(metadata.publishDate);
    } else {
      // Look for date patterns in content
      const datePatterns = [
        /(\d{4})-(\d{2})-(\d{2})/g,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi
      ];
      
      for (const pattern of datePatterns) {
        const match = pattern.exec(content);
        if (match) {
          publishDate = new Date(match[0]);
          break;
        }
      }
    }
    
    if (publishDate && !isNaN(publishDate.getTime())) {
      const now = new Date();
      const ageInDays = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Freshness scoring based on age
      if (ageInDays <= 1) score = 1.0;
      else if (ageInDays <= 7) score = 0.95;
      else if (ageInDays <= 30) score = 0.85;
      else if (ageInDays <= 90) score = 0.75;
      else if (ageInDays <= 365) score = 0.65;
      else score = 0.5;
      
      // Bonus for recently updated content
      if (content.toLowerCase().includes('updated') && ageInDays <= 30) {
        score += 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Assess content readability
  private assessReadability(content: string): number {
    const cleanText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ').filter(w => w.length > 0);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (words.length === 0 || sentences.length === 0) return 0;
    
    // Simple readability metrics
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    let score = 0.7; // Base readability
    
    // Optimal sentence length (10-20 words per sentence)
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      score += 0.15;
    } else if (avgWordsPerSentence < 5 || avgWordsPerSentence > 30) {
      score -= 0.2;
    }
    
    // Word complexity (average word length)
    if (avgCharsPerWord >= 4 && avgCharsPerWord <= 7) {
      score += 0.1;
    } else if (avgCharsPerWord > 10) {
      score -= 0.15;
    }
    
    // Paragraph distribution
    const paragraphs = content.split(/<\/?p[^>]*>/i).filter(p => p.trim().length > 0);
    if (paragraphs.length >= 3) score += 0.05;
    
    return Math.max(0, Math.min(1, score));
  }

  // Assess how easy content is to extract
  private assessExtractability(content: string, analysis: ContentAnalysis): number {
    let score = 0.6; // Base extractability
    
    // Well-structured HTML
    const hasStructuredData = !!(
      content.includes('itemscope') || 
      content.includes('schema.org') ||
      content.includes('json-ld')
    );
    
    if (hasStructuredData) score += 0.2;
    
    // Clear content sections
    if (analysis.structure.contentSections.includes('main_content')) score += 0.15;
    if (analysis.structure.contentSections.includes('article')) score += 0.1;
    
    // Good heading structure for navigation
    if (analysis.structure.headingLevels.length >= 2) score += 0.1;
    
    // Clear metadata
    if (Object.keys(analysis.structure.metadata).length > 3) score += 0.1;
    
    // Penalize extraction difficulties
    const problematicElements = [
      content.includes('javascript:') ? 1 : 0,
      content.includes('onclick=') ? 1 : 0,
      content.includes('data-') ? 0.5 : 0, // Dynamic content indicators
      content.includes('<!--') && content.includes('-->') ? 0.2 : 0 // Too many comments
    ].reduce((sum, val) => sum + val, 0);
    
    score -= Math.min(0.3, problematicElements * 0.1);
    
    return Math.max(0, Math.min(1, score));
  }

  // Generate quality factors and suggestions
  private generateQualityFactors(
    breakdown: QualityScore['breakdown'], 
    content: string, 
    analysis: ContentAnalysis
  ): QualityScore['factors'] {
    
    const positive: string[] = [];
    const negative: string[] = [];
    const suggestions: string[] = [];
    
    // Completeness factors
    if (breakdown.completeness > 0.8) {
      positive.push('Content is comprehensive and complete');
    } else if (breakdown.completeness < 0.5) {
      negative.push('Content appears incomplete or too brief');
      suggestions.push('Look for more detailed sources with complete information');
    }
    
    // Structure factors
    if (breakdown.structure > 0.8) {
      positive.push('Well-structured with clear organization');
    } else if (breakdown.structure < 0.5) {
      negative.push('Poor content structure and organization');
      suggestions.push('Prefer sources with clear headings and paragraph structure');
    }
    
    // Relevance factors
    if (breakdown.relevance > 0.8) {
      positive.push('Highly relevant and valuable content');
    } else if (breakdown.relevance < 0.6) {
      negative.push('Content may be low-value or promotional');
      suggestions.push('Filter out promotional and advertisement content');
    }
    
    // Freshness factors
    if (breakdown.freshness > 0.9) {
      positive.push('Very recent and up-to-date content');
    } else if (breakdown.freshness < 0.6) {
      negative.push('Content may be outdated');
      suggestions.push('Consider filtering content older than 6 months');
    }
    
    // Readability factors
    if (breakdown.readability > 0.8) {
      positive.push('Excellent readability and clarity');
    } else if (breakdown.readability < 0.5) {
      negative.push('Poor readability or formatting issues');
      suggestions.push('Look for sources with better formatting and structure');
    }
    
    // Extractability factors
    if (breakdown.extractability > 0.8) {
      positive.push('Easy to extract with high accuracy');
    } else if (breakdown.extractability < 0.6) {
      negative.push('May be difficult to extract accurately');
      suggestions.push('Use simpler extraction fields or manual review');
    }
    
    // Content type specific factors
    const contentType = analysis.primaryType.type;
    if (contentType === 'product_page') {
      if (analysis.patterns.hasPrice && analysis.patterns.hasRating) {
        positive.push('Complete product information available');
      }
    } else if (contentType === 'news_article') {
      if (analysis.patterns.hasAuthor && analysis.patterns.hasPublishDate) {
        positive.push('Proper journalistic attribution');
      }
    }
    
    return { positive, negative, suggestions };
  }

  // Calculate letter grade
  private calculateGrade(overall: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (overall >= 0.9) return 'A';
    if (overall >= 0.8) return 'B';
    if (overall >= 0.7) return 'C';
    if (overall >= 0.6) return 'D';
    return 'F';
  }

  // Generate processing recommendation
  private generateRecommendation(
    overall: number, 
    breakdown: QualityScore['breakdown'], 
    analysis: ContentAnalysis
  ): 'extract' | 'skip' | 'review_manually' {
    
    // High quality - extract automatically
    if (overall >= 0.8) return 'extract';
    
    // Very low quality - skip
    if (overall < 0.5) return 'skip';
    
    // Medium quality with specific issues - needs review
    if (breakdown.extractability < 0.6) return 'review_manually';
    if (breakdown.relevance < 0.6) return 'review_manually';
    if (analysis.primaryType.confidence < 0.7) return 'review_manually';
    
    // Medium quality but extractable - proceed with extraction
    if (overall >= 0.65) return 'extract';
    
    return 'review_manually';
  }

  // Filter content based on quality criteria
  filterContent(
    contentList: Array<{ content: string; url: string; analysis: ContentAnalysis; quality?: QualityScore }>,
    filter: ContentFilter
  ): Array<{ content: string; url: string; analysis: ContentAnalysis; quality: QualityScore; passed: boolean }> {
    
    console.log(`🔍 Applying quality filters to ${contentList.length} items`);
    
    return contentList.map(item => {
      // Calculate quality if not provided
      const quality = item.quality || this.analyzeQuality(item.content, item.url, item.analysis);
      
      let passed = true;
      const reasons: string[] = [];
      
      // Quality score filter
      if (quality.overall < filter.minQualityScore) {
        passed = false;
        reasons.push(`Quality score ${(quality.overall * 100).toFixed(1)}% below minimum ${(filter.minQualityScore * 100).toFixed(1)}%`);
      }
      
      // Word count filter
      const wordCount = item.content.replace(/<[^>]+>/g, ' ').split(/\s+/).length;
      if (wordCount < filter.minWordCount) {
        passed = false;
        reasons.push(`Word count ${wordCount} below minimum ${filter.minWordCount}`);
      }
      
      // Blocked keywords
      const lowerContent = item.content.toLowerCase();
      const blockedFound = filter.blockedKeywords.filter(keyword => 
        lowerContent.includes(keyword.toLowerCase())
      );
      if (blockedFound.length > 0) {
        passed = false;
        reasons.push(`Contains blocked keywords: ${blockedFound.join(', ')}`);
      }
      
      // Domain whitelist (if specified)
      if (filter.allowedDomains.length > 0) {
        const domain = new URL(item.url).hostname;
        const domainAllowed = filter.allowedDomains.some(allowed => 
          domain.includes(allowed) || allowed.includes(domain)
        );
        if (!domainAllowed) {
          passed = false;
          reasons.push(`Domain ${domain} not in allowed list`);
        }
      }
      
      if (!passed) {
        console.log(`❌ Filtered out: ${item.url} - ${reasons.join(', ')}`);
      }
      
      return { ...item, quality, passed };
    });
  }

  // Detect duplicate content
  detectDuplicates(
    content: string,
    url: string,
    title: string,
    threshold: number = 0.8
  ): DuplicateDetection {
    
    const contentHash = this.generateContentHash(content);
    const titleHash = this.generateContentHash(title);
    
    let isDuplicate = false;
    let maxSimilarity = 0;
    const duplicateOf: string[] = [];
    
    // Check against existing content
    for (const [existingHash, existing] of this.processedContent) {
      const similarity = this.calculateSimilarity(contentHash, existingHash);
      const titleSimilarity = this.calculateSimilarity(titleHash, this.generateContentHash(existing.title));
      
      const combinedSimilarity = (similarity * 0.7) + (titleSimilarity * 0.3);
      
      if (combinedSimilarity > threshold) {
        isDuplicate = true;
        duplicateOf.push(existing.url);
      }
      
      maxSimilarity = Math.max(maxSimilarity, combinedSimilarity);
    }
    
    // Store current content for future comparison
    this.processedContent.set(contentHash, {
      hash: contentHash,
      url,
      title,
      timestamp: Date.now()
    });
    
    const uniqueContent = Math.max(0, (1 - maxSimilarity) * 100);
    
    return {
      isDuplicate,
      similarityScore: maxSimilarity,
      duplicateOf,
      uniqueContent
    };
  }

  // Generate content hash for comparison
  private generateContentHash(content: string): string {
    const cleaned = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    let hash = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Calculate similarity between content hashes
  private calculateSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;
    
    // Simple character-based similarity
    const longer = hash1.length > hash2.length ? hash1 : hash2;
    const shorter = hash1.length > hash2.length ? hash2 : hash1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer[i] === shorter[i]) matches++;
    }
    
    return matches / longer.length;
  }

  // Get quality statistics
  getQualityStats(): {
    totalProcessed: number;
    averageQuality: number;
    gradeDistribution: Record<string, number>;
    topIssues: string[];
  } {
    // In a real implementation, you'd track quality statistics
    return {
      totalProcessed: this.processedContent.size,
      averageQuality: 0.75,
      gradeDistribution: { 'A': 15, 'B': 35, 'C': 30, 'D': 15, 'F': 5 },
      topIssues: ['Low word count', 'Missing metadata', 'Poor structure']
    };
  }
}

// Export singleton instance
export const contentQualityAnalyzer = new ContentQualityAnalyzer();