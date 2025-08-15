// Content Writer Node Executor (AI-powered)
import { BaseNodeExecutor } from './registry';
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult } from '../types';

export class ContentWriterExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { 
        topic,
        contentType = 'article',
        targetKeywords = [],
        wordCount = 1000,
        tone = 'professional',
        model = 'gpt-4',
        includeOutline = true
      } = node.properties;
      
      if (!topic) {
        throw new Error('Topic is required for Content Writer node');
      }

      // Generate content using AI
      const content = await this.generateContent({
        topic,
        contentType,
        targetKeywords,
        wordCount,
        tone,
        model,
        includeOutline
      });

      const executionTime = Date.now() - startTime;

      return this.createResult(
        true,
        {
          topic,
          contentType,
          targetKeywords,
          wordCount: content.actualWordCount,
          tone,
          model,
          content: content.text,
          outline: content.outline,
          seoRecommendations: content.seoRecommendations,
          generatedAt: new Date().toISOString()
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

  private async generateContent(params: {
    topic: string;
    contentType: string;
    targetKeywords: string[];
    wordCount: number;
    tone: string;
    model: string;
    includeOutline: boolean;
  }): Promise<{
    text: string;
    actualWordCount: number;
    outline?: string[];
    seoRecommendations: string[];
  }> {
    // In production, integrate with OpenAI, Claude, or other AI APIs
    // For now, generate simulated content
    
    const outline = params.includeOutline ? this.generateOutline(params.topic, params.contentType) : undefined;
    const content = this.generateSimulatedContent(params.topic, params.targetKeywords, params.wordCount);
    const seoRecommendations = this.generateSEORecommendations(params.targetKeywords);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      text: content,
      actualWordCount: content.split(/\s+/).length,
      outline,
      seoRecommendations
    };
  }

  private generateOutline(topic: string, contentType: string): string[] {
    const outlines = {
      article: [
        'Introduction',
        `What is ${topic}?`,
        `Benefits of ${topic}`,
        `How to get started with ${topic}`,
        'Best practices and tips',
        'Common mistakes to avoid',
        'Conclusion'
      ],
      blog: [
        'Hook and introduction',
        `Understanding ${topic}`,
        'Key points and insights',
        'Practical applications',
        'Call to action'
      ],
      guide: [
        'Overview',
        'Prerequisites',
        'Step-by-step instructions',
        'Troubleshooting',
        'Next steps'
      ]
    };
    
    return outlines[contentType as keyof typeof outlines] || outlines.article;
  }

  private generateSimulatedContent(topic: string, keywords: string[], wordCount: number): string {
    const paragraphs = [];
    const targetParagraphs = Math.ceil(wordCount / 150); // ~150 words per paragraph
    
    // Introduction paragraph
    paragraphs.push(
      `${topic} has become increasingly important in today's digital landscape. ` +
      `Understanding the fundamentals of ${topic} can help businesses and individuals ` +
      `achieve better results and stay competitive. In this comprehensive guide, we'll ` +
      `explore the key aspects of ${topic} and provide actionable insights.`
    );
    
    // Main content paragraphs
    for (let i = 1; i < targetParagraphs - 1; i++) {
      const keywordToUse = keywords[i % keywords.length] || topic;
      paragraphs.push(
        `When working with ${keywordToUse}, it's essential to consider multiple factors. ` +
        `The implementation of ${topic} requires careful planning and attention to detail. ` +
        `Many professionals have found success by focusing on ${keywordToUse} strategies ` +
        `that align with their specific goals and objectives. This approach ensures ` +
        `optimal results and long-term sustainability.`
      );
    }
    
    // Conclusion paragraph
    paragraphs.push(
      `In conclusion, ${topic} represents a valuable opportunity for growth and improvement. ` +
      `By implementing the strategies and best practices outlined in this guide, you can ` +
      `achieve meaningful results. Remember to stay updated with the latest trends and ` +
      `continue refining your approach for maximum effectiveness.`
    );
    
    return paragraphs.join('\n\n');
  }

  private generateSEORecommendations(keywords: string[]): string[] {
    return [
      'Include target keywords naturally in the first paragraph',
      'Use semantic keywords and related terms throughout the content',
      'Optimize headings with target keywords when relevant',
      'Add internal links to related content on your website',
      'Include a clear call-to-action at the end',
      'Optimize meta title and description with primary keyword',
      'Consider adding FAQ section for long-tail keywords',
      'Include relevant images with alt text containing keywords'
    ];
  }
}