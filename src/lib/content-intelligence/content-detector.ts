/**
 * Intelligent Content Type Detection Engine
 * Uses AI-powered analysis to automatically detect content types and suggest optimal extraction schemas
 */

export interface ContentType {
  type: string;
  confidence: number;
  description: string;
  characteristics: string[];
  suggestedFields: string[];
  industry?: string;
}

export interface ContentAnalysis {
  primaryType: ContentType;
  secondaryTypes: ContentType[];
  patterns: {
    hasAuthor: boolean;
    hasPublishDate: boolean;
    hasCategories: boolean;
    hasTags: boolean;
    hasImages: boolean;
    hasComments: boolean;
    hasRating: boolean;
    hasPrice: boolean;
    hasSpecs: boolean;
    wordCount: number;
    paragraphCount: number;
    linkCount: number;
  };
  structure: {
    title: string;
    headingLevels: number[];
    contentSections: string[];
    metadata: Record<string, any>;
  };
  quality: {
    score: number;
    factors: string[];
    readability: number;
    completeness: number;
  };
}

class ContentTypeDetector {
  // Comprehensive content type definitions with detection patterns
  private contentTypes: Record<string, ContentType> = {
    'news_article': {
      type: 'news_article',
      confidence: 0,
      description: 'News articles and journalism content',
      characteristics: [
        'Contains byline/author information',
        'Has publish timestamp',
        'Includes news categories or tags',
        'References current events or breaking news',
        'Contains quotes or source citations'
      ],
      suggestedFields: [
        'headline', 'author', 'publishDate', 'category', 'summary', 
        'content', 'location', 'tags', 'sources', 'imageUrl'
      ],
      industry: 'media'
    },
    
    'blog_post': {
      type: 'blog_post',
      confidence: 0,
      description: 'Blog posts and personal articles',
      characteristics: [
        'Personal or informal tone',
        'Author bio or profile',
        'Comment sections',
        'Social sharing buttons',
        'Related posts suggestions'
      ],
      suggestedFields: [
        'title', 'author', 'publishDate', 'content', 'excerpt', 
        'categories', 'tags', 'commentCount', 'socialShares'
      ],
      industry: 'publishing'
    },
    
    'product_page': {
      type: 'product_page',
      confidence: 0,
      description: 'E-commerce product listings',
      characteristics: [
        'Price information',
        'Product specifications',
        'Customer reviews and ratings',
        'Add to cart functionality',
        'Product images and gallery'
      ],
      suggestedFields: [
        'productName', 'price', 'description', 'specifications', 
        'rating', 'reviewCount', 'images', 'availability', 'brand', 'category'
      ],
      industry: 'ecommerce'
    },
    
    'documentation': {
      type: 'documentation',
      confidence: 0,
      description: 'Technical documentation and guides',
      characteristics: [
        'Table of contents',
        'Code examples or snippets',
        'Step-by-step instructions',
        'API references',
        'Version information'
      ],
      suggestedFields: [
        'title', 'section', 'content', 'codeExamples', 
        'version', 'lastUpdated', 'tags', 'difficulty'
      ],
      industry: 'technology'
    },
    
    'recipe': {
      type: 'recipe',
      confidence: 0,
      description: 'Cooking recipes and food content',
      characteristics: [
        'Ingredients list',
        'Cooking instructions',
        'Prep and cook times',
        'Nutritional information',
        'Serving size information'
      ],
      suggestedFields: [
        'recipeName', 'ingredients', 'instructions', 'prepTime', 
        'cookTime', 'servings', 'nutrition', 'difficulty', 'cuisine'
      ],
      industry: 'food'
    },
    
    'job_posting': {
      type: 'job_posting',
      confidence: 0,
      description: 'Job listings and career opportunities',
      characteristics: [
        'Job title and company name',
        'Salary or compensation info',
        'Requirements and qualifications',
        'Location information',
        'Application instructions'
      ],
      suggestedFields: [
        'jobTitle', 'company', 'location', 'salary', 'requirements', 
        'description', 'benefits', 'applicationUrl', 'postedDate', 'jobType'
      ],
      industry: 'recruitment'
    },
    
    'real_estate': {
      type: 'real_estate',
      confidence: 0,
      description: 'Property listings and real estate',
      characteristics: [
        'Property price and details',
        'Square footage and room counts',
        'Location and neighborhood info',
        'Property features and amenities',
        'Contact information for agent'
      ],
      suggestedFields: [
        'propertyTitle', 'price', 'bedrooms', 'bathrooms', 'sqft', 
        'address', 'features', 'description', 'images', 'agent', 'listingDate'
      ],
      industry: 'real_estate'
    },
    
    'event_listing': {
      type: 'event_listing',
      confidence: 0,
      description: 'Events and entertainment listings',
      characteristics: [
        'Event date and time',
        'Venue and location info',
        'Ticket pricing',
        'Event description',
        'Organizer information'
      ],
      suggestedFields: [
        'eventName', 'dateTime', 'venue', 'location', 'price', 
        'description', 'organizer', 'category', 'ticketUrl'
      ],
      industry: 'entertainment'
    }
  };

  // Analyze content and detect type with confidence scoring
  async analyzeContent(content: string, url: string = '', metadata: any = {}): Promise<ContentAnalysis> {
    console.log(`🔍 Analyzing content type for: ${url || 'content'}`);
    
    const analysis = this.performStructuralAnalysis(content, metadata);
    const patterns = this.detectContentPatterns(content, url);
    const typeScores = this.calculateTypeConfidence(content, url, patterns);
    
    // Sort content types by confidence
    const sortedTypes = Object.values(typeScores)
      .sort((a, b) => b.confidence - a.confidence);
    
    const primaryType = sortedTypes[0];
    const secondaryTypes = sortedTypes.slice(1, 4); // Top 3 alternatives
    
    const quality = this.assessContentQuality(content, patterns, primaryType);
    
    console.log(`🎯 Primary content type detected: ${primaryType.type} (${(primaryType.confidence * 100).toFixed(1)}% confidence)`);
    
    return {
      primaryType,
      secondaryTypes,
      patterns,
      structure: analysis.structure,
      quality
    };
  }

  // Perform structural analysis of content
  private performStructuralAnalysis(content: string, metadata: any): {
    structure: ContentAnalysis['structure'];
  } {
    // Extract title from content or metadata
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                      content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch?.[1]?.trim() || metadata.title || 'Untitled';
    
    // Detect heading levels
    const headingMatches = content.match(/<h([1-6])[^>]*>/gi) || [];
    const headingLevels = [...new Set(
      headingMatches.map(h => parseInt(h.match(/h([1-6])/i)?.[1] || '1'))
    )].sort();
    
    // Identify content sections
    const contentSections = [];
    if (content.includes('main') || content.includes('article')) contentSections.push('main_content');
    if (content.includes('sidebar')) contentSections.push('sidebar');
    if (content.includes('footer')) contentSections.push('footer');
    if (content.includes('nav')) contentSections.push('navigation');
    if (content.includes('header')) contentSections.push('header');
    
    // Extract metadata from HTML meta tags
    const metaTags: Record<string, any> = {};
    const metaMatches = content.match(/<meta[^>]+>/gi) || [];
    metaMatches.forEach(meta => {
      const nameMatch = meta.match(/name=['"]([^'"]+)['"]/i);
      const propertyMatch = meta.match(/property=['"]([^'"]+)['"]/i);
      const contentMatch = meta.match(/content=['"]([^'"]+)['"]/i);
      
      const key = nameMatch?.[1] || propertyMatch?.[1];
      const value = contentMatch?.[1];
      
      if (key && value) {
        metaTags[key] = value;
      }
    });
    
    return {
      structure: {
        title,
        headingLevels,
        contentSections,
        metadata: metaTags
      }
    };
  }

  // Detect content patterns and characteristics
  private detectContentPatterns(content: string, url: string): ContentAnalysis['patterns'] {
    const lowerContent = content.toLowerCase();
    const cleanText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    return {
      hasAuthor: !!(
        lowerContent.includes('author') || 
        lowerContent.includes('by ') ||
        lowerContent.includes('written by') ||
        content.match(/rel=['"]author['"]|class=['"][^'"]*author[^'"]*['"]|itemprop=['"]author['"]/)
      ),
      
      hasPublishDate: !!(
        lowerContent.includes('published') ||
        lowerContent.includes('posted') ||
        content.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/) ||
        content.match(/datetime=['"]|class=['"][^'"]*date[^'"]*['"]/)
      ),
      
      hasCategories: !!(
        lowerContent.includes('category') ||
        lowerContent.includes('categories') ||
        content.match(/class=['"][^'"]*categor[^'"]*['"]/)
      ),
      
      hasTags: !!(
        lowerContent.includes('tag') ||
        lowerContent.includes('hashtag') ||
        content.match(/class=['"][^'"]*tag[^'"]*['"]|#\w+/)
      ),
      
      hasImages: !!(
        content.match(/<img[^>]+>/) ||
        content.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)
      ),
      
      hasComments: !!(
        lowerContent.includes('comment') ||
        lowerContent.includes('reply') ||
        content.match(/class=['"][^'"]*comment[^'"]*['"]/)
      ),
      
      hasRating: !!(
        lowerContent.includes('rating') ||
        lowerContent.includes('stars') ||
        lowerContent.includes('review') ||
        content.match(/★|⭐|rating|score/i)
      ),
      
      hasPrice: !!(
        content.match(/\$\d+|\$\d+\.\d{2}|€\d+|£\d+|price|cost/i) ||
        lowerContent.includes('price') ||
        lowerContent.includes('cost')
      ),
      
      hasSpecs: !!(
        lowerContent.includes('specification') ||
        lowerContent.includes('features') ||
        lowerContent.includes('technical') ||
        content.match(/class=['"][^'"]*spec[^'"]*['"]/)
      ),
      
      wordCount: cleanText.split(' ').filter(w => w.length > 0).length,
      paragraphCount: (content.match(/<p[^>]*>/gi) || content.split('\n\n')).length,
      linkCount: (content.match(/<a[^>]+href/gi) || []).length
    };
  }

  // Calculate confidence scores for each content type
  private calculateTypeConfidence(content: string, url: string, patterns: ContentAnalysis['patterns']): Record<string, ContentType> {
    const scores = { ...this.contentTypes };
    const lowerContent = content.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    // News Article Detection
    let newsScore = 0;
    if (patterns.hasAuthor) newsScore += 0.3;
    if (patterns.hasPublishDate) newsScore += 0.3;
    if (patterns.hasCategories) newsScore += 0.2;
    if (lowerContent.includes('breaking') || lowerContent.includes('news')) newsScore += 0.2;
    if (lowerUrl.includes('news') || lowerUrl.includes('article')) newsScore += 0.15;
    if (patterns.wordCount > 300 && patterns.wordCount < 2000) newsScore += 0.1;
    scores.news_article.confidence = Math.min(newsScore, 1.0);
    
    // Blog Post Detection
    let blogScore = 0;
    if (patterns.hasAuthor) blogScore += 0.25;
    if (patterns.hasComments) blogScore += 0.25;
    if (patterns.hasTags) blogScore += 0.2;
    if (lowerUrl.includes('blog') || lowerUrl.includes('post')) blogScore += 0.2;
    if (patterns.wordCount > 500) blogScore += 0.1;
    if (lowerContent.includes('i ') || lowerContent.includes('my ')) blogScore += 0.1; // Personal tone
    scores.blog_post.confidence = Math.min(blogScore, 1.0);
    
    // Product Page Detection
    let productScore = 0;
    if (patterns.hasPrice) productScore += 0.4;
    if (patterns.hasRating) productScore += 0.3;
    if (patterns.hasSpecs) productScore += 0.2;
    if (lowerContent.includes('buy') || lowerContent.includes('cart')) productScore += 0.15;
    if (lowerUrl.includes('product') || lowerUrl.includes('shop')) productScore += 0.15;
    scores.product_page.confidence = Math.min(productScore, 1.0);
    
    // Documentation Detection
    let docScore = 0;
    if (lowerContent.includes('api') || lowerContent.includes('documentation')) docScore += 0.3;
    if (content.match(/<code|```|function\s*\(/)) docScore += 0.3;
    if (patterns.headingLevels && patterns.headingLevels.length > 2) docScore += 0.2;
    if (lowerUrl.includes('doc') || lowerUrl.includes('guide')) docScore += 0.2;
    scores.documentation.confidence = Math.min(docScore, 1.0);
    
    // Recipe Detection
    let recipeScore = 0;
    if (lowerContent.includes('ingredients')) recipeScore += 0.4;
    if (lowerContent.includes('instructions') || lowerContent.includes('directions')) recipeScore += 0.3;
    if (lowerContent.includes('prep time') || lowerContent.includes('cook time')) recipeScore += 0.2;
    if (lowerUrl.includes('recipe') || lowerUrl.includes('cooking')) recipeScore += 0.2;
    scores.recipe.confidence = Math.min(recipeScore, 1.0);
    
    // Job Posting Detection
    let jobScore = 0;
    if (lowerContent.includes('salary') || lowerContent.includes('compensation')) jobScore += 0.3;
    if (lowerContent.includes('requirements') || lowerContent.includes('qualifications')) jobScore += 0.3;
    if (lowerContent.includes('apply') || lowerContent.includes('resume')) jobScore += 0.2;
    if (lowerUrl.includes('job') || lowerUrl.includes('career')) jobScore += 0.2;
    scores.job_posting.confidence = Math.min(jobScore, 1.0);
    
    // Real Estate Detection
    let realEstateScore = 0;
    if (lowerContent.includes('bedroom') || lowerContent.includes('bathroom')) realEstateScore += 0.3;
    if (lowerContent.includes('sqft') || lowerContent.includes('square feet')) realEstateScore += 0.2;
    if (patterns.hasPrice && lowerContent.includes('property')) realEstateScore += 0.3;
    if (lowerUrl.includes('property') || lowerUrl.includes('real-estate')) realEstateScore += 0.2;
    scores.real_estate.confidence = Math.min(realEstateScore, 1.0);
    
    // Event Listing Detection
    let eventScore = 0;
    if (lowerContent.includes('event') || lowerContent.includes('concert')) eventScore += 0.3;
    if (lowerContent.includes('venue') || lowerContent.includes('location')) eventScore += 0.2;
    if (lowerContent.includes('ticket') || lowerContent.includes('admission')) eventScore += 0.3;
    if (patterns.hasPublishDate && lowerContent.includes('date')) eventScore += 0.2;
    scores.event_listing.confidence = Math.min(eventScore, 1.0);
    
    return scores;
  }

  // Assess content quality and completeness
  private assessContentQuality(content: string, patterns: ContentAnalysis['patterns'], primaryType: ContentType): ContentAnalysis['quality'] {
    let score = 0.5; // Base score
    const factors: string[] = [];
    
    // Word count assessment
    if (patterns.wordCount > 300) {
      score += 0.1;
      factors.push('Adequate content length');
    } else if (patterns.wordCount < 100) {
      score -= 0.2;
      factors.push('Content too short');
    }
    
    // Structure assessment
    if (patterns.paragraphCount > 3) {
      score += 0.1;
      factors.push('Well-structured content');
    }
    
    // Metadata completeness
    if (patterns.hasAuthor) {
      score += 0.1;
      factors.push('Author information present');
    }
    
    if (patterns.hasPublishDate) {
      score += 0.1;
      factors.push('Publication date available');
    }
    
    // Type-specific quality factors
    if (primaryType.type === 'product_page') {
      if (patterns.hasPrice) {
        score += 0.15;
        factors.push('Price information available');
      }
      if (patterns.hasRating) {
        score += 0.1;
        factors.push('Customer ratings present');
      }
    }
    
    if (primaryType.type === 'news_article') {
      if (patterns.hasCategories) {
        score += 0.1;
        factors.push('Proper categorization');
      }
    }
    
    // Calculate readability (simplified)
    const readability = Math.max(0, Math.min(1, 1 - (patterns.wordCount / 2000)));
    
    // Calculate completeness based on suggested fields presence
    const completeness = this.calculateCompleteness(content, patterns, primaryType);
    
    return {
      score: Math.max(0, Math.min(1, score)),
      factors,
      readability,
      completeness
    };
  }

  // Calculate content completeness based on expected fields
  private calculateCompleteness(content: string, patterns: ContentAnalysis['patterns'], primaryType: ContentType): number {
    const requiredFields = primaryType.suggestedFields;
    let presentFields = 0;
    
    // Simple field presence detection
    if (requiredFields.includes('author') && patterns.hasAuthor) presentFields++;
    if (requiredFields.includes('publishDate') && patterns.hasPublishDate) presentFields++;
    if (requiredFields.includes('categories') && patterns.hasCategories) presentFields++;
    if (requiredFields.includes('tags') && patterns.hasTags) presentFields++;
    if (requiredFields.includes('price') && patterns.hasPrice) presentFields++;
    if (requiredFields.includes('rating') && patterns.hasRating) presentFields++;
    
    return requiredFields.length > 0 ? presentFields / requiredFields.length : 1.0;
  }

  // Get content type by name
  getContentType(typeName: string): ContentType | null {
    return this.contentTypes[typeName] || null;
  }

  // Get all available content types
  getAllContentTypes(): ContentType[] {
    return Object.values(this.contentTypes);
  }
}

// Export singleton instance
export const contentTypeDetector = new ContentTypeDetector();