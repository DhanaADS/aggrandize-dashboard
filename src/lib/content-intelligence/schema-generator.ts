/**
 * Auto-Schema Generator - Intelligent Field Detection and Schema Creation
 * Automatically generates optimal extraction schemas based on content analysis
 */

import { ContentAnalysis, contentTypeDetector } from './content-detector';

export interface SchemaField {
  name: string;
  type: 'text' | 'number' | 'date' | 'url' | 'email' | 'array' | 'boolean';
  description: string;
  selector?: string;
  required: boolean;
  confidence: number;
  examples: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    format?: string;
  };
}

export interface GeneratedSchema {
  schemaId: string;
  contentType: string;
  confidence: number;
  fields: SchemaField[];
  customPrompt: string;
  metadata: {
    generatedAt: string;
    sampledFrom: string;
    industry: string;
    templateVersion: string;
  };
  performance: {
    estimatedAccuracy: number;
    recommendedModels: string[];
    processingComplexity: 'low' | 'medium' | 'high';
  };
}

export interface SchemaTemplate {
  id: string;
  name: string;
  contentType: string;
  description: string;
  fields: SchemaField[];
  industry: string;
  usageCount: number;
  successRate: number;
  lastUpdated: string;
}

class SchemaGenerator {
  private templates: Map<string, SchemaTemplate> = new Map();
  
  constructor() {
    this.initializePredefinedTemplates();
  }

  // Generate optimal schema based on content analysis
  async generateSchema(
    contentAnalysis: ContentAnalysis, 
    sampleContent: string[], 
    url: string = ''
  ): Promise<GeneratedSchema> {
    
    console.log(`🧠 Generating schema for content type: ${contentAnalysis.primaryType.type}`);
    
    const schemaId = `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contentType = contentAnalysis.primaryType.type;
    
    // Generate fields based on content analysis and samples
    const fields = await this.generateFields(contentAnalysis, sampleContent);
    
    // Create optimized prompt for the detected content type
    const customPrompt = this.generateCustomPrompt(contentType, fields);
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(contentType, fields);
    
    const schema: GeneratedSchema = {
      schemaId,
      contentType,
      confidence: contentAnalysis.primaryType.confidence,
      fields,
      customPrompt,
      metadata: {
        generatedAt: new Date().toISOString(),
        sampledFrom: url,
        industry: contentAnalysis.primaryType.industry || 'general',
        templateVersion: '2.0'
      },
      performance
    };

    // Save as template if quality is high enough
    if (schema.confidence > 0.8) {
      await this.saveAsTemplate(schema);
    }

    console.log(`✅ Generated schema with ${fields.length} fields (${(schema.confidence * 100).toFixed(1)}% confidence)`);
    
    return schema;
  }

  // Generate intelligent field recommendations
  private async generateFields(
    analysis: ContentAnalysis, 
    sampleContent: string[]
  ): Promise<SchemaField[]> {
    
    const fields: SchemaField[] = [];
    const contentType = analysis.primaryType.type;
    
    // Always include basic fields
    fields.push({
      name: 'title',
      type: 'text',
      description: 'Main title or headline of the content',
      required: true,
      confidence: 0.95,
      examples: this.extractTitleExamples(sampleContent),
      validation: { minLength: 5, maxLength: 200 }
    });

    fields.push({
      name: 'content',
      type: 'text',
      description: 'Main body content',
      required: true,
      confidence: 0.98,
      examples: ['Main article text...', 'Primary content...'],
      validation: { minLength: 50 }
    });

    fields.push({
      name: 'url',
      type: 'url',
      description: 'Source URL of the content',
      required: true,
      confidence: 1.0,
      examples: ['https://example.com/article'],
      validation: { format: 'url' }
    });

    // Add pattern-based fields
    if (analysis.patterns.hasAuthor) {
      fields.push({
        name: 'author',
        type: 'text',
        description: 'Author or writer of the content',
        required: false,
        confidence: 0.85,
        examples: this.extractAuthorExamples(sampleContent),
        validation: { maxLength: 100 }
      });
    }

    if (analysis.patterns.hasPublishDate) {
      fields.push({
        name: 'publishDate',
        type: 'date',
        description: 'Publication or creation date',
        required: false,
        confidence: 0.8,
        examples: ['2024-01-15', '2024-01-15T10:30:00Z'],
        validation: { format: 'date' }
      });
    }

    if (analysis.patterns.hasCategories) {
      fields.push({
        name: 'category',
        type: 'text',
        description: 'Primary category or classification',
        required: false,
        confidence: 0.75,
        examples: this.extractCategoryExamples(sampleContent, contentType),
        validation: { maxLength: 50 }
      });
    }

    if (analysis.patterns.hasTags) {
      fields.push({
        name: 'tags',
        type: 'array',
        description: 'Related tags or keywords',
        required: false,
        confidence: 0.7,
        examples: [['technology', 'AI', 'innovation']],
        validation: { maxLength: 100 }
      });
    }

    // Add content-type specific fields
    fields.push(...this.generateTypeSpecificFields(contentType, analysis));

    // Sort by confidence and required status
    return fields.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return b.confidence - a.confidence;
    });
  }

  // Generate content-type specific fields
  private generateTypeSpecificFields(contentType: string, analysis: ContentAnalysis): SchemaField[] {
    const fields: SchemaField[] = [];

    switch (contentType) {
      case 'news_article':
        fields.push(
          {
            name: 'headline',
            type: 'text',
            description: 'News headline (may differ from title)',
            required: false,
            confidence: 0.8,
            examples: ['Breaking: Major Development in...'],
            validation: { maxLength: 150 }
          },
          {
            name: 'location',
            type: 'text',
            description: 'Geographic location mentioned in the article',
            required: false,
            confidence: 0.6,
            examples: ['New York', 'Washington D.C.'],
            validation: { maxLength: 100 }
          },
          {
            name: 'summary',
            type: 'text',
            description: 'Brief summary or lead paragraph',
            required: false,
            confidence: 0.75,
            examples: ['Article summary...'],
            validation: { minLength: 50, maxLength: 500 }
          }
        );
        break;

      case 'product_page':
        if (analysis.patterns.hasPrice) {
          fields.push({
            name: 'price',
            type: 'text',
            description: 'Product price',
            required: true,
            confidence: 0.9,
            examples: ['$99.99', '$1,299.00', '€79.99'],
            validation: { pattern: '^[\\$€£]?[\\d,]+\\.?\\d*$' }
          });
        }
        
        if (analysis.patterns.hasRating) {
          fields.push({
            name: 'rating',
            type: 'number',
            description: 'Product rating or score',
            required: false,
            confidence: 0.85,
            examples: ['4.5', '3.8', '5.0'],
            validation: { pattern: '^[0-5](\\.\\d)?$' }
          });
        }

        fields.push(
          {
            name: 'brand',
            type: 'text',
            description: 'Product brand or manufacturer',
            required: false,
            confidence: 0.7,
            examples: ['Apple', 'Samsung', 'Sony'],
            validation: { maxLength: 50 }
          },
          {
            name: 'availability',
            type: 'text',
            description: 'Stock status or availability',
            required: false,
            confidence: 0.6,
            examples: ['In Stock', 'Out of Stock', 'Limited Quantity'],
            validation: { maxLength: 50 }
          }
        );

        if (analysis.patterns.hasSpecs) {
          fields.push({
            name: 'specifications',
            type: 'text',
            description: 'Product specifications and features',
            required: false,
            confidence: 0.8,
            examples: ['Key technical specifications...'],
            validation: { minLength: 20 }
          });
        }
        break;

      case 'job_posting':
        fields.push(
          {
            name: 'company',
            type: 'text',
            description: 'Hiring company name',
            required: true,
            confidence: 0.9,
            examples: ['Google', 'Microsoft', 'Startup Inc.'],
            validation: { maxLength: 100 }
          },
          {
            name: 'location',
            type: 'text',
            description: 'Job location',
            required: true,
            confidence: 0.85,
            examples: ['San Francisco, CA', 'Remote', 'New York, NY'],
            validation: { maxLength: 100 }
          },
          {
            name: 'salary',
            type: 'text',
            description: 'Salary range or compensation',
            required: false,
            confidence: 0.7,
            examples: ['$80,000 - $120,000', 'Competitive salary'],
            validation: { maxLength: 100 }
          },
          {
            name: 'jobType',
            type: 'text',
            description: 'Employment type',
            required: false,
            confidence: 0.75,
            examples: ['Full-time', 'Part-time', 'Contract'],
            validation: { maxLength: 50 }
          }
        );
        break;

      case 'recipe':
        fields.push(
          {
            name: 'ingredients',
            type: 'array',
            description: 'List of recipe ingredients',
            required: true,
            confidence: 0.95,
            examples: [['2 cups flour', '1 egg', '1/2 cup sugar']],
            validation: { minLength: 1 }
          },
          {
            name: 'instructions',
            type: 'text',
            description: 'Cooking instructions',
            required: true,
            confidence: 0.9,
            examples: ['Step-by-step cooking instructions...'],
            validation: { minLength: 50 }
          },
          {
            name: 'prepTime',
            type: 'text',
            description: 'Preparation time',
            required: false,
            confidence: 0.8,
            examples: ['15 minutes', '30 mins'],
            validation: { maxLength: 50 }
          },
          {
            name: 'cookTime',
            type: 'text',
            description: 'Cooking time',
            required: false,
            confidence: 0.8,
            examples: ['25 minutes', '1 hour'],
            validation: { maxLength: 50 }
          },
          {
            name: 'servings',
            type: 'number',
            description: 'Number of servings',
            required: false,
            confidence: 0.7,
            examples: ['4', '6', '8'],
            validation: { pattern: '^\\d+$' }
          }
        );
        break;

      case 'real_estate':
        fields.push(
          {
            name: 'bedrooms',
            type: 'number',
            description: 'Number of bedrooms',
            required: false,
            confidence: 0.85,
            examples: ['2', '3', '4'],
            validation: { pattern: '^\\d+$' }
          },
          {
            name: 'bathrooms',
            type: 'number',
            description: 'Number of bathrooms',
            required: false,
            confidence: 0.85,
            examples: ['1.5', '2', '2.5'],
            validation: { pattern: '^\\d+(\\.\\d)?$' }
          },
          {
            name: 'sqft',
            type: 'number',
            description: 'Square footage',
            required: false,
            confidence: 0.8,
            examples: ['1200', '1850', '2500'],
            validation: { pattern: '^\\d+$' }
          },
          {
            name: 'address',
            type: 'text',
            description: 'Property address',
            required: false,
            confidence: 0.9,
            examples: ['123 Main St, City, State'],
            validation: { maxLength: 200 }
          }
        );
        break;

      default:
        // Add generic fields for unknown content types
        if (analysis.patterns.hasImages) {
          fields.push({
            name: 'imageUrl',
            type: 'url',
            description: 'Primary image URL',
            required: false,
            confidence: 0.6,
            examples: ['https://example.com/image.jpg'],
            validation: { format: 'url' }
          });
        }
    }

    return fields;
  }

  // Generate optimized extraction prompt
  private generateCustomPrompt(contentType: string, fields: SchemaField[]): string {
    const requiredFields = fields.filter(f => f.required);
    const optionalFields = fields.filter(f => !f.required);
    
    let prompt = `You are an expert content extraction AI specialized in ${contentType.replace('_', ' ')} content. `;
    prompt += `Extract the following information from the provided content with high accuracy and consistency.\n\n`;
    
    prompt += `**REQUIRED FIELDS:**\n`;
    requiredFields.forEach(field => {
      prompt += `- **${field.name}**: ${field.description}`;
      if (field.examples.length > 0) {
        prompt += ` (Example: ${field.examples[0]})`;
      }
      prompt += `\n`;
    });
    
    if (optionalFields.length > 0) {
      prompt += `\n**OPTIONAL FIELDS (extract if available):**\n`;
      optionalFields.forEach(field => {
        prompt += `- **${field.name}**: ${field.description}`;
        if (field.examples.length > 0) {
          prompt += ` (Example: ${field.examples[0]})`;
        }
        prompt += `\n`;
      });
    }
    
    // Add content-type specific instructions
    prompt += this.getTypeSpecificInstructions(contentType);
    
    prompt += `\n**OUTPUT FORMAT:**\n`;
    prompt += `Return a valid JSON object with the extracted fields. Use null for missing optional fields.\n\n`;
    
    prompt += `**QUALITY GUIDELINES:**\n`;
    prompt += `- Extract exact information without interpretation\n`;
    prompt += `- Maintain original formatting where appropriate\n`;
    prompt += `- Use consistent date formats (YYYY-MM-DD)\n`;
    prompt += `- Extract complete, meaningful content\n`;
    prompt += `- Return null for fields that cannot be found\n`;
    
    return prompt;
  }

  // Get content-type specific extraction instructions
  private getTypeSpecificInstructions(contentType: string): string {
    const instructions: Record<string, string> = {
      'news_article': `
**NEWS-SPECIFIC INSTRUCTIONS:**
- Extract the headline exactly as published
- Include location if mentioned in the article
- Summary should be the lead paragraph or article summary
- Preserve journalistic tone and factual information`,

      'product_page': `
**PRODUCT-SPECIFIC INSTRUCTIONS:**
- Extract exact price including currency symbol
- Rating should be numerical (e.g., 4.5 out of 5)
- Specifications should include key technical details
- Brand should be the official manufacturer name`,

      'job_posting': `
**JOB-SPECIFIC INSTRUCTIONS:**
- Company name should be official business name
- Salary should include full range if provided
- Location should specify city, state, or "Remote"
- Job type: Full-time, Part-time, Contract, Internship`,

      'recipe': `
**RECIPE-SPECIFIC INSTRUCTIONS:**
- Ingredients should be a complete list with measurements
- Instructions should be step-by-step and complete
- Times should include units (minutes, hours)
- Servings should be numerical`,

      'real_estate': `
**REAL ESTATE-SPECIFIC INSTRUCTIONS:**
- Bedrooms and bathrooms should be numerical
- Square footage should be numerical only
- Address should be complete including city/state if available
- Price should include currency symbol`
    };

    return instructions[contentType] || '';
  }

  // Calculate performance metrics for the schema
  private calculatePerformanceMetrics(contentType: string, fields: SchemaField[]): GeneratedSchema['performance'] {
    let estimatedAccuracy = 0.85; // Base accuracy
    
    // Adjust based on field complexity
    const complexFields = fields.filter(f => 
      f.type === 'array' || f.type === 'date' || f.validation?.pattern
    ).length;
    
    if (complexFields > fields.length * 0.5) {
      estimatedAccuracy -= 0.1; // More complex fields = slightly lower accuracy
    }
    
    // Adjust based on content type
    const typeAccuracy: Record<string, number> = {
      'product_page': 0.9,
      'news_article': 0.88,
      'job_posting': 0.85,
      'recipe': 0.92,
      'documentation': 0.87,
      'blog_post': 0.83,
      'real_estate': 0.86,
      'event_listing': 0.8
    };
    
    estimatedAccuracy = (estimatedAccuracy + (typeAccuracy[contentType] || 0.8)) / 2;
    
    // Recommend models based on complexity
    let processingComplexity: 'low' | 'medium' | 'high' = 'medium';
    let recommendedModels: string[] = [];
    
    if (fields.length <= 5 && complexFields <= 1) {
      processingComplexity = 'low';
      recommendedModels = [
        'google/gemma-3n-e2b-it:free',
        'google/gemma-3n-4b:free',
        'deepseek/deepseek-r1-0528-qwen3-8b:free'
      ];
    } else if (fields.length > 8 || complexFields > 3) {
      processingComplexity = 'high';
      recommendedModels = [
        'qwen/qwen3-235b-a22b-thinking-2507',
        'openai/gpt-4o-mini',
        'anthropic/claude-3-5-haiku-20241022',
        'google/gemini-2.0-flash-exp'
      ];
    } else {
      recommendedModels = [
        'google/gemma-3n-4b:free',
        'openai/gpt-4o-mini',
        'qwen/qwen3-235b-a22b-thinking-2507',
        'mistral/devstral-small-2505:free'
      ];
    }
    
    return {
      estimatedAccuracy: Math.round(estimatedAccuracy * 100) / 100,
      recommendedModels,
      processingComplexity
    };
  }

  // Extract example values from sample content
  private extractTitleExamples(sampleContent: string[]): string[] {
    const examples: string[] = [];
    
    sampleContent.forEach(content => {
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                         content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (titleMatch?.[1]) {
        examples.push(titleMatch[1].trim().substring(0, 80) + '...');
      }
    });
    
    return examples.slice(0, 3);
  }

  private extractAuthorExamples(sampleContent: string[]): string[] {
    const examples = ['John Doe', 'Jane Smith', 'Editorial Team'];
    // In a real implementation, you'd extract actual author names from the sample content
    return examples;
  }

  private extractCategoryExamples(sampleContent: string[], contentType: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'news_article': ['Politics', 'Technology', 'Sports', 'Business'],
      'blog_post': ['Personal', 'Tutorial', 'Opinion', 'Review'],
      'product_page': ['Electronics', 'Clothing', 'Home & Garden', 'Books'],
      'job_posting': ['Technology', 'Marketing', 'Sales', 'Engineering'],
      'recipe': ['Appetizers', 'Main Course', 'Desserts', 'Beverages']
    };
    
    return categoryMap[contentType] || ['General', 'Featured', 'Popular'];
  }

  // Save high-quality schema as reusable template
  private async saveAsTemplate(schema: GeneratedSchema): Promise<void> {
    const template: SchemaTemplate = {
      id: `template_${Date.now()}`,
      name: `Auto-generated ${schema.contentType.replace('_', ' ')} template`,
      contentType: schema.contentType,
      description: `Automatically generated template for ${schema.contentType} content with ${(schema.confidence * 100).toFixed(1)}% confidence`,
      fields: schema.fields,
      industry: schema.metadata.industry,
      usageCount: 0,
      successRate: schema.performance.estimatedAccuracy,
      lastUpdated: new Date().toISOString()
    };
    
    this.templates.set(template.id, template);
    console.log(`💾 Saved schema as template: ${template.name}`);
  }

  // Initialize predefined high-quality templates
  private initializePredefinedTemplates(): void {
    // News Article Template
    const newsTemplate: SchemaTemplate = {
      id: 'news_standard',
      name: 'Standard News Article',
      contentType: 'news_article',
      description: 'Standard template for news articles and journalism content',
      fields: [
        { name: 'headline', type: 'text', description: 'Article headline', required: true, confidence: 0.95, examples: ['Breaking News: ...'] },
        { name: 'author', type: 'text', description: 'Article author', required: false, confidence: 0.9, examples: ['John Reporter'] },
        { name: 'publishDate', type: 'date', description: 'Publication date', required: false, confidence: 0.85, examples: ['2024-01-15'] },
        { name: 'content', type: 'text', description: 'Article content', required: true, confidence: 0.98, examples: ['Full article text...'] }
      ],
      industry: 'media',
      usageCount: 150,
      successRate: 0.92,
      lastUpdated: new Date().toISOString()
    };
    
    this.templates.set(newsTemplate.id, newsTemplate);
    
    // Add more predefined templates...
    console.log(`🎯 Initialized ${this.templates.size} predefined templates`);
  }

  // Get available templates
  getTemplates(contentType?: string): SchemaTemplate[] {
    const templates = Array.from(this.templates.values());
    
    if (contentType) {
      return templates.filter(t => t.contentType === contentType);
    }
    
    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  // Get template by ID
  getTemplate(templateId: string): SchemaTemplate | null {
    return this.templates.get(templateId) || null;
  }

  // Update template usage statistics
  updateTemplateUsage(templateId: string, success: boolean): void {
    const template = this.templates.get(templateId);
    if (template) {
      template.usageCount++;
      if (success) {
        template.successRate = (template.successRate + 1) / 2; // Simplified success rate update
      }
      template.lastUpdated = new Date().toISOString();
    }
  }
}

// Export singleton instance
export const schemaGenerator = new SchemaGenerator();