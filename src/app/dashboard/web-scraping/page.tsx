'use client';

import { useState, useEffect } from 'react';
import styles from './web-scraping.module.css';

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'url' | 'email';
  description?: string;
}

interface DiscoveredSource {
  type: 'sitemap' | 'rss' | 'atom';
  url: string;
  title: string;
  count: number;
  selected: boolean;
}

interface ProcessingStats {
  total_found: number;
  total_extracted: number;
  total_filtered: number;
  total_processed: number;
}

interface ExtractedData {
  [key: string]: string | null;
  source_url: string;
}

interface ExtractionResult {
  success: boolean;
  data?: {
    domain: string;
    results: ExtractedData[];
    timestamp: string;
  } & ProcessingStats;
  error?: string;
}

const AI_PROVIDERS = {
  openai: { name: 'OpenAI', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  claude: { name: 'Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  openrouter: { 
    name: 'OpenRouter', 
    models: [
      // User's Working Model (Priority)
      'google/gemma-3n-e2b-it:free',
      // Latest Free Models (2025) - 100% Working
      'google/gemma-3n-2b:free',
      'google/gemma-3n-4b:free', 
      'deepseek/deepseek-r1-0528-qwen3-8b:free',
      'mistral/devstral-small-2505:free',
      'tencent/hunyuan-a13b-instruct:free',
      'venice/uncensored-dolphin-mistral-24b:free',
      'kimi/k2:free',
      // Latest Premium Models (2025) - Top Performance
      'qwen/qwen3-235b-a22b-thinking-2507',
      'openai/gpt-4o',
      'openai/gpt-4o-mini', 
      'anthropic/claude-3-5-sonnet-20241022',
      'anthropic/claude-3-5-haiku-20241022',
      'google/gemini-2.0-flash-exp',
      'google/gemini-1.5-pro',
      'mistral/mistral-large-2407',
      'xai/grok-2-1212',
      'meta-llama/llama-3.3-70b-instruct',
      'meta-llama/llama-3.1-405b-instruct'
    ] 
  },
  gemini: { name: 'Gemini', models: ['google/gemma-3n-e2b-it:free'] }
};

// Fallback model priority (most reliable first) - 2025 Updated
const FALLBACK_MODELS = [
  // User's Working Model First
  'google/gemma-3n-e2b-it:free',
  // Fastest Free Models
  'google/gemma-3n-4b:free',
  'deepseek/deepseek-r1-0528-qwen3-8b:free',
  'mistral/devstral-small-2505:free',
  'google/gemma-3n-2b:free',
  'tencent/hunyuan-a13b-instruct:free',
  // Reliable Paid Fallbacks
  'openai/gpt-4o-mini',
  'anthropic/claude-3-5-haiku-20241022',
  'google/gemini-2.0-flash-exp'
];

const PROMPT_TEMPLATES = {
  company_info: {
    name: 'Company Information',
    description: 'Extract basic company details',
    prompt: 'Extract the following information from this article: company name, CEO/founder name, industry, location, website URL. If any information is not found, return null for that field.',
    fields: [
      { name: 'company_name', type: 'text', description: 'Name of the company' },
      { name: 'ceo_name', type: 'text', description: 'CEO or founder name' },
      { name: 'industry', type: 'text', description: 'Industry sector' },
      { name: 'location', type: 'text', description: 'Company location' },
      { name: 'website', type: 'url', description: 'Company website' }
    ]
  },
  funding_details: {
    name: 'Funding Information',
    description: 'Extract startup funding and investment details',
    prompt: 'Extract funding information from this article: funding amount, funding round type, lead investor, total funding raised, valuation. Return numbers without currency symbols.',
    fields: [
      { name: 'funding_amount', type: 'text', description: 'Latest funding amount' },
      { name: 'funding_round', type: 'text', description: 'Type of funding round' },
      { name: 'lead_investor', type: 'text', description: 'Lead investor name' },
      { name: 'total_raised', type: 'text', description: 'Total funding raised' },
      { name: 'valuation', type: 'text', description: 'Company valuation' }
    ]
  },
  product_info: {
    name: 'Product Details',
    description: 'Extract product and service information',
    prompt: 'Extract product information from this article: product name, product category, key features, target market, pricing model.',
    fields: [
      { name: 'product_name', type: 'text', description: 'Product or service name' },
      { name: 'category', type: 'text', description: 'Product category' },
      { name: 'key_features', type: 'text', description: 'Main features' },
      { name: 'target_market', type: 'text', description: 'Target audience' },
      { name: 'pricing_model', type: 'text', description: 'Pricing structure' }
    ]
  }
};

export default function WebScrapingPage() {
  const [step, setStep] = useState<'discover' | 'configure' | 'process' | 'results'>('discover');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof PROMPT_TEMPLATES | 'custom'>('company_info');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiConfig, setAiConfig] = useState({
    provider: 'openrouter' as keyof typeof AI_PROVIDERS,
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    apiKey: ''
  });
  const [maxArticles, setMaxArticles] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [results, setResults] = useState<ExtractedData[] | null>(null);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [isTestingModels, setIsTestingModels] = useState(false);
  const [modelTestResults, setModelTestResults] = useState<any>(null);

  // Load template when selected
  useEffect(() => {
    if (selectedTemplate !== 'custom' && PROMPT_TEMPLATES[selectedTemplate]) {
      const template = PROMPT_TEMPLATES[selectedTemplate];
      setCustomPrompt(template.prompt);
      setCustomFields(template.fields.map((field, index) => ({
        ...field,
        id: `field-${index}`,
        type: field.type as CustomField['type']
      })));
    }
  }, [selectedTemplate]);

  // Clear API test result when config changes
  useEffect(() => {
    setApiTestResult(null);
    setModelTestResults(null);
  }, [aiConfig.provider, aiConfig.model, aiConfig.apiKey]);

  const handleDiscoverSources = async () => {
    if (!sitemapUrl.trim()) return;
    
    setIsDiscovering(true);
    setDiscoveredSources([]);

    try {
      const response = await fetch('/api/scryptr/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: sitemapUrl })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover sources');
      }

      if (data.success && data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
        setDiscoveredSources(data.sources.map((source: DiscoveredSource) => ({
          ...source,
          selected: true
        })));
        setStep('configure');
      } else {
        throw new Error(data.error || 'No sources found for this URL');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover sources';
      alert(errorMessage);
      console.error(error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'text',
      description: ''
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(fields =>
      fields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(fields => fields.filter(field => field.id !== id));
  };

  const startProgressSimulation = () => {
    const stages = [
      { progress: 5, status: 'Discovering articles from sitemap...' },
      { progress: 15, status: 'Extracting article content...' },
      { progress: 30, status: 'Processing with AI (this may take a while)...' },
      { progress: 60, status: 'AI analyzing articles...' },
      { progress: 85, status: 'Formatting results...' },
      { progress: 95, status: 'Finalizing...' }
    ];

    let currentStage = 0;
    // Estimate based on article count: ~6 seconds per article for AI processing
    const estimatedDuration = Math.max(60000, maxArticles * 6000); // minimum 1 minute
    const intervalDuration = estimatedDuration / stages.length;

    return setInterval(() => {
      if (currentStage < stages.length) {
        setProcessingProgress(stages[currentStage].progress);
        setProcessingStatus(stages[currentStage].status);
        currentStage++;
      }
    }, intervalDuration);
  };

  const testApiKey = async () => {
    if (!aiConfig.apiKey.trim()) {
      setApiTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const response = await fetch('/api/scrape/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model
        })
      });

      const result = await response.json();
      
      setApiTestResult({
        success: result.success && result.valid,
        message: result.message || result.error || 'Test completed'
      });

    } catch (error) {
      setApiTestResult({
        success: false,
        message: 'Failed to test API key. Please check your connection.'
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const testAllModels = async () => {
    if (!aiConfig.apiKey.trim()) {
      alert('Please enter an API key first');
      return;
    }

    setIsTestingModels(true);
    setModelTestResults(null);

    try {
      const modelsToTest = AI_PROVIDERS[aiConfig.provider].models;
      
      const response = await fetch('/api/scrape/test-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          models: modelsToTest
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setModelTestResults(result);
        
        // Auto-select the best available model
        if (result.summary.recommendedModel) {
          setAiConfig(prev => ({ ...prev, model: result.summary.recommendedModel }));
        }
      } else {
        alert('Failed to test models: ' + (result.error || 'Unknown error'));
      }

    } catch (error) {
      alert('Failed to test models. Please check your connection.');
    } finally {
      setIsTestingModels(false);
    }
  };

  const validateConfiguration = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!aiConfig.apiKey.trim()) {
      errors.push('API key is required');
    }

    if (customFields.length === 0) {
      errors.push('At least one data field must be defined');
    }

    if (!customPrompt.trim()) {
      errors.push('AI prompt cannot be empty');
    }

    const selectedSources = discoveredSources.filter(source => source.selected);
    if (selectedSources.length === 0) {
      errors.push('At least one source must be selected');
    }

    // Check for empty field names
    const emptyFields = customFields.filter(field => !field.name.trim());
    if (emptyFields.length > 0) {
      errors.push('All data fields must have names');
    }

    // Check for duplicate field names
    const fieldNames = customFields.map(field => field.name.toLowerCase());
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate field names are not allowed');
    }

    // Validate API key format (basic check)
    if (aiConfig.apiKey.trim()) {
      if (aiConfig.provider === 'openrouter' && !aiConfig.apiKey.startsWith('sk-or-')) {
        errors.push('OpenRouter API keys should start with "sk-or-"');
      } else if (aiConfig.provider === 'openai' && !aiConfig.apiKey.startsWith('sk-')) {
        errors.push('OpenAI API keys should start with "sk-"');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleStartProcessing = async () => {
    // Validate configuration
    const validation = validateConfiguration();
    if (!validation.isValid) {
      const errorMessage = 'Configuration Issues:\n\n' + 
        validation.errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
      alert(errorMessage);
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus('Initializing...');
    setStep('process');

    try {
      // Extract domain from sitemap URL
      const domain = new URL(sitemapUrl).hostname;

      const selectedSources = discoveredSources.filter(source => source.selected);
      
      const requestData = {
        domain,
        sources: selectedSources,
        aiConfig: {
          apiProvider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          customPrompt,
          dataFields: customFields.map(field => field.name),
          filters: {
            maxArticles,
            dateRange: 0,
            keywords: ''
          }
        }
      };

      // Start progress simulation
      const progressInterval = startProgressSimulation();

      // Create timeout controller for the API request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      console.log('🚀 Sending request to /api/scryptr/extract');
      console.log('📋 Request data:', JSON.stringify(requestData, null, 2));
      
      const response = await fetch('/api/scryptr/extract', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📥 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      // Clear progress simulation
      clearInterval(progressInterval);

      let data: ExtractionResult;
      
      try {
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText.substring(0, 500));
        
        // Check if response is HTML (error page)
        if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON. Check your authentication or API route.');
        }
        
        data = JSON.parse(responseText);
        console.log('✅ Parsed JSON response:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error(`Invalid server response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      if (data.success && data.data) {
        setProcessingProgress(100);
        setProcessingStatus('Processing complete!');
        
        // Debug: Log the results array
        console.log('📊 Results array length:', data.data.results?.length || 0);
        console.log('📋 First result sample:', data.data.results?.[0]);
        console.log('🔍 All result keys:', data.data.results?.[0] ? Object.keys(data.data.results[0]) : 'No results');
        
        setResults(data.data.results || []);
        setProcessingStats({
          total_found: data.data.total_found || 0,
          total_extracted: data.data.total_extracted || 0,
          total_filtered: data.data.total_filtered || data.data.total_found || 0,
          total_processed: data.data.total_processed || 0
        });
        
        // Check if no articles were processed and show specific message
        if (data.data.total_processed === 0) {
          console.log('Debug info:', {
            total_found: data.data.total_found,
            total_extracted: data.data.total_extracted,
            total_filtered: data.data.total_filtered,
            total_processed: data.data.total_processed,
            results_count: data.data.results?.length || 0
          });
          
          setProcessingStatus('⚠️ Processing completed but no articles were successfully processed');
        }
        
        // Small delay to show completion
        setTimeout(() => {
          setStep('results');
        }, 1500);
      } else {
        setProcessingStatus('Processing failed');
        alert(data.error || 'Processing failed');
        setStep('configure');
      }
    } catch (error) {
      console.error('Processing error:', error);
      
      let errorMessage = 'Processing failed';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Processing timed out after 4 minutes. Try reducing the number of articles or check your API key.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setProcessingStatus(`❌ ${errorMessage}`);
      alert(errorMessage);
      setStep('configure');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToExcel = async () => {
    if (!results) return;

    try {
      const response = await fetch('/api/scrape/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: results,
          fields: customFields,
          filename: `scraped-data-${new Date().toISOString().split('T')[0]}`
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraped-data-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>AI Web Scraping Tool</h1>
          <p className={styles.subtitle}>
            Extract custom data from sitemaps and RSS feeds using AI
          </p>
        </div>
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step === 'discover' ? styles.active : step !== 'discover' ? styles.completed : ''}`}>
            <span className={styles.stepNumber}>1</span>
            <span>Discover</span>
          </div>
          <div className={`${styles.step} ${step === 'configure' ? styles.active : ['process', 'results'].includes(step) ? styles.completed : ''}`}>
            <span className={styles.stepNumber}>2</span>
            <span>Configure</span>
          </div>
          <div className={`${styles.step} ${step === 'process' ? styles.active : step === 'results' ? styles.completed : ''}`}>
            <span className={styles.stepNumber}>3</span>
            <span>Process</span>
          </div>
          <div className={`${styles.step} ${step === 'results' ? styles.active : ''}`}>
            <span className={styles.stepNumber}>4</span>
            <span>Results</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Step 1: Discover Sources */}
        {step === 'discover' && (
          <div className={styles.stepSection}>
            <div className={styles.sectionHeader}>
              <h2>🗺️ Step 1: Discover Content Sources</h2>
              <p>Enter a sitemap URL or website to discover content sources</p>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="sitemap-url" className={styles.label}>
                Sitemap or Website URL
              </label>
              <input
                type="url"
                id="sitemap-url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml or https://example.com"
                className={styles.input}
              />
              <p className={styles.helpText}>
                📍 <strong>Examples:</strong> https://example.com/sitemap.xml, https://blog.example.com/feed, or https://example.com<br/>
                💡 <strong>Tip:</strong> We'll automatically discover sitemaps and RSS feeds from any website
              </p>
            </div>

            <button
              onClick={handleDiscoverSources}
              disabled={!sitemapUrl.trim() || isDiscovering}
              className={styles.primaryButton}
            >
              {isDiscovering ? (
                <>
                  <span className={styles.spinner}></span>
                  Discovering Sources...
                </>
              ) : (
                '🔍 Discover Sources'
              )}
            </button>
          </div>
        )}

        {/* Step 2: Configure AI and Fields */}
        {step === 'configure' && (
          <div className={styles.stepSection}>
            <div className={styles.sectionHeader}>
              <h2>⚙️ Step 2: Configure AI Data Extraction</h2>
              <p>Set up what data you want to extract from each article</p>
            </div>

            {/* Sources Overview */}
            <div className={styles.sourcesSection}>
              <h3>📊 Discovered Sources ({discoveredSources.length})</h3>
              <div className={styles.sourcesList}>
                {discoveredSources.map((source, index) => (
                  <div key={index} className={styles.sourceCard}>
                    <label className={styles.sourceCheckbox}>
                      <input
                        type="checkbox"
                        checked={source.selected}
                        onChange={(e) => {
                          setDiscoveredSources(prev =>
                            prev.map((s, i) => 
                              i === index ? { ...s, selected: e.target.checked } : s
                            )
                          );
                        }}
                      />
                      <div className={styles.sourceInfo}>
                        <span className={styles.sourceType}>
                          {source.type === 'sitemap' ? '🗺️' : '📡'} {source.type.toUpperCase()}
                        </span>
                        <span className={styles.sourceTitle}>{source.title}</span>
                        <span className={styles.sourceCount}>{source.count} items</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Configuration */}
            <div className={styles.aiConfigSection}>
              <h3>🤖 AI Configuration</h3>
              <div className={styles.configGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>AI Provider</label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => setAiConfig(prev => ({
                      ...prev,
                      provider: e.target.value as keyof typeof AI_PROVIDERS,
                      model: AI_PROVIDERS[e.target.value as keyof typeof AI_PROVIDERS].models[0]
                    }))}
                    className={styles.select}
                  >
                    {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                      <option key={key} value={key}>
                        {provider.name} {key === 'openrouter' ? '(Recommended - Free models available)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className={styles.helpText}>
                    {aiConfig.provider === 'openrouter' 
                      ? '✅ <strong>Recommended:</strong> Free models available, no credit card required. Get API key at openrouter.ai/keys'
                      : aiConfig.provider === 'openai'
                      ? '💰 <strong>Paid Service:</strong> Requires OpenAI account with credits. Get API key at platform.openai.com/api-keys'
                      : aiConfig.provider === 'claude' 
                      ? '💰 <strong>Paid Service:</strong> Requires Anthropic account with credits. Get API key at console.anthropic.com'
                      : '💰 <strong>Note:</strong> May require paid account with credits'
                    }
                  </p>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Model</label>
                  <select
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className={styles.select}
                  >
                    {AI_PROVIDERS[aiConfig.provider].models.map((model) => (
                      <option key={model} value={model}>
                        {model} {model.includes('free') ? '(Free)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className={styles.helpText}>
                    {aiConfig.provider === 'openrouter' 
                      ? '🆓 Models marked "free" don\'t require credits. Try "openai/gpt-oss-20b:free" first.'
                      : '🤖 Choose a model that fits your budget and accuracy needs'}
                  </p>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>API Key</label>
                  <div className={styles.apiKeyContainer}>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder={aiConfig.provider === 'openrouter' ? 'sk-or-v1-...' : aiConfig.provider === 'openai' ? 'sk-...' : 'Enter your API key'}
                      className={styles.input}
                    />
                    <button
                      onClick={testApiKey}
                      disabled={isTestingApi || !aiConfig.apiKey.trim()}
                      className={styles.testButton}
                    >
                      {isTestingApi ? (
                        <>
                          <span className={styles.spinner}></span>
                          Testing...
                        </>
                      ) : (
                        'Test Key'
                      )}
                    </button>
                  </div>
                  <p className={styles.helpText}>
                    🔑 <strong>API Key Safety:</strong> Your key is only used for this session and never stored permanently<br/>
                    🧪 <strong>Always Test:</strong> Click "Test Key" to verify your API key works before processing
                  </p>
                  
                  {/* Model Testing Section */}
                  <div className={styles.modelTestSection}>
                    <button
                      onClick={testAllModels}
                      disabled={isTestingModels || !aiConfig.apiKey.trim()}
                      className={styles.testButton}
                      style={{marginTop: '1rem', width: '100%'}}
                    >
                      {isTestingModels ? (
                        <>
                          <span className={styles.spinner}></span>
                          Testing All Models...
                        </>
                      ) : (
                        '🔍 Test All Models (Recommended)'
                      )}
                    </button>
                    
                    {modelTestResults && (
                      <div className={styles.modelTestResults}>
                        <div className={styles.testSummary}>
                          <h4>📊 Model Availability Report</h4>
                          <p>{modelTestResults.summary.available} of {modelTestResults.summary.total} models available</p>
                          {modelTestResults.summary.recommendedModel && (
                            <p>✅ <strong>Selected:</strong> {modelTestResults.summary.recommendedModel}</p>
                          )}
                        </div>
                        
                        <div className={styles.modelList}>
                          {modelTestResults.results.map((result: any, index: number) => (
                            <div 
                              key={index} 
                              className={`${styles.modelResult} ${result.available ? styles.available : styles.unavailable}`}
                            >
                              <span className={styles.modelIcon}>
                                {result.available ? '✅' : '❌'}
                              </span>
                              <span className={styles.modelName}>{result.model}</span>
                              <span className={styles.modelStatus}>
                                {result.available ? 
                                  `${result.responseTime}ms` : 
                                  result.error || 'Unavailable'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {apiTestResult && (
                    <div className={`${styles.testResult} ${apiTestResult.success ? styles.success : styles.error}`}>
                      <span className={styles.testIcon}>
                        {apiTestResult.success ? '✅' : '❌'}
                      </span>
                      {apiTestResult.message}
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Max Articles</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={maxArticles}
                    onChange={(e) => setMaxArticles(parseInt(e.target.value) || 50)}
                    className={styles.input}
                  />
                  <p className={styles.helpText}>
                    ⚡ <strong>Processing Time:</strong> ~6 seconds per article. {maxArticles} articles ≈ {Math.ceil(maxArticles * 6 / 60)} minute(s).
                  </p>
                </div>
              </div>
            </div>

            {/* Template Selection */}
            <div className={styles.templateSection}>
              <h3>📋 Extraction Template</h3>
              <p className={styles.helpText} style={{marginBottom: '1.5rem'}}>
                🚀 <strong>Quick Start:</strong> Choose a pre-built template or create custom fields for your specific needs
              </p>
              <div className={styles.templateGrid}>
                {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                  <div
                    key={key}
                    className={`${styles.templateCard} ${selectedTemplate === key ? styles.selected : ''}`}
                    onClick={() => setSelectedTemplate(key as keyof typeof PROMPT_TEMPLATES)}
                  >
                    <h4>{template.name}</h4>
                    <p>{template.description}</p>
                    <div className={styles.templateFields}>
                      {template.fields.slice(0, 3).map((field) => (
                        <span key={field.name} className={styles.fieldTag}>
                          {field.name}
                        </span>
                      ))}
                      {template.fields.length > 3 && (
                        <span className={styles.fieldTag}>+{template.fields.length - 3} more</span>
                      )}
                    </div>
                  </div>
                ))}
                <div
                  className={`${styles.templateCard} ${selectedTemplate === 'custom' ? styles.selected : ''}`}
                  onClick={() => setSelectedTemplate('custom')}
                >
                  <h4>Custom Template</h4>
                  <p>Define your own fields and prompt</p>
                  <div className={styles.templateFields}>
                    <span className={styles.fieldTag}>Custom</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className={styles.fieldsSection}>
              <div className={styles.fieldsHeader}>
                <h3>📝 Data Fields to Extract</h3>
                <button onClick={addCustomField} className={styles.addButton}>
                  + Add Field
                </button>
              </div>
              <p className={styles.helpText} style={{marginBottom: '1rem'}}>
                🏷️ <strong>Field Naming:</strong> Use clear, lowercase names with underscores (e.g., "company_name", "ceo_email")<br/>
                📊 <strong>Field Types:</strong> Text for names/descriptions, Number for amounts, URL for links, Date for timestamps
              </p>
              
              <div className={styles.fieldsList}>
                {customFields.map((field) => (
                  <div key={field.id} className={styles.fieldEditor}>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                      placeholder="Field name (e.g., company_name, ceo_name, funding_amount)"
                      className={styles.fieldNameInput}
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateCustomField(field.id, { type: e.target.value as CustomField['type'] })}
                      className={styles.fieldTypeSelect}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="url">URL</option>
                      <option value="email">Email</option>
                    </select>
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) => updateCustomField(field.id, { description: e.target.value })}
                      placeholder="Description (e.g., 'Full name of company CEO')"
                      className={styles.fieldDescInput}
                    />
                    <button
                      onClick={() => removeCustomField(field.id)}
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className={styles.promptSection}>
              <h3>💬 AI Extraction Prompt</h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter instructions for the AI on what data to extract..."
                className={styles.promptTextarea}
                rows={6}
              />
              <p className={styles.helpText}>
                💬 <strong>Prompt Tips:</strong><br/>
                • Be specific about what data you want (e.g., "company name", "CEO full name")<br/>
                • Mention the format (e.g., "return null if not found")<br/>
                • Use clear field names that match your data fields above<br/>
                • Example: "Extract the company name, CEO name, and funding amount. Return null for missing data."
              </p>
            </div>

            <div className={styles.stepActions}>
              <button
                onClick={() => setStep('discover')}
                className={styles.secondaryButton}
              >
                ← Back
              </button>
              <button
                onClick={handleStartProcessing}
                disabled={!aiConfig.apiKey || customFields.length === 0}
                className={styles.primaryButton}
              >
                🚀 Start Processing
              </button>
            </div>
            {(!aiConfig.apiKey || customFields.length === 0) && (
              <p className={styles.helpText} style={{textAlign: 'center', marginTop: '1rem', color: 'rgba(255, 107, 107, 0.8)'}}>
                ⚠️ Please {!aiConfig.apiKey ? 'add an API key' : ''}{!aiConfig.apiKey && customFields.length === 0 ? ' and ' : ''}{customFields.length === 0 ? 'add at least one data field' : ''} to continue
              </p>
            )}
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'process' && (
          <div className={styles.stepSection}>
            <div className={styles.sectionHeader}>
              <h2>⚡ Step 3: Processing Articles</h2>
              <p>AI is reading articles and extracting your requested data</p>
            </div>

            <div className={styles.processingStatus}>
              <div className={styles.processingAnimation}>
                <div className={styles.spinner}></div>
                <div className={styles.processingText}>
                  <h3>Processing in Progress</h3>
                  <p>{processingStatus}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <div className={styles.progressText}>
                  {processingProgress}% Complete
                </div>
              </div>
              
              {processingStats && (
                <div className={styles.processingStats}>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>{processingStats.total_found}</span>
                    <span className={styles.statLabel}>Articles Found</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>{processingStats.total_extracted}</span>
                    <span className={styles.statLabel}>Content Extracted</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>{processingStats.total_processed}</span>
                    <span className={styles.statLabel}>AI Processed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && (
          <div className={styles.stepSection}>
            <div className={styles.sectionHeader}>
              <h2>📊 Step 4: Extraction Results</h2>
              <p>Review and export your extracted data</p>
            </div>

            {processingStats && (
              <div className={styles.resultsStats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{processingStats.total_found}</span>
                  <span className={styles.statLabel}>Total Articles Found</span>
                </div>
                <div className={styles.stat}>
                  <span className={`${styles.statNumber} ${processingStats.total_processed === 0 ? styles.errorStat : ''}`}>
                    {processingStats.total_processed}
                  </span>
                  <span className={styles.statLabel}>Successfully Processed</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{customFields.length}</span>
                  <span className={styles.statLabel}>Data Fields</span>
                </div>
              </div>
            )}

            {/* Error Analysis */}
            {processingStats && processingStats.total_processed === 0 && processingStats.total_found > 0 && (
              <div className={styles.errorAnalysis}>
                <h3 className={styles.errorTitle}>⚠️ Processing Issue Detected</h3>
                <div className={styles.errorContent}>
                  <p className={styles.errorDescription}>
                    We found {processingStats.total_found} articles but couldn't process any with AI. 
                    This usually indicates an API key or model access issue.
                  </p>
                  
                  <div className={styles.errorSteps}>
                    <h4>Troubleshooting Steps:</h4>
                    <ol>
                      <li>
                        <strong>Test your API key:</strong> Use the "Test Key" button in the configuration step
                      </li>
                      <li>
                        <strong>Check your credits:</strong> Make sure your {aiConfig.provider} account has sufficient credits
                      </li>
                      <li>
                        <strong>Try a different model:</strong> Some models require special access permissions
                      </li>
                      <li>
                        <strong>Verify model availability:</strong> The model "{aiConfig.model}" might be temporarily unavailable
                      </li>
                    </ol>
                  </div>

                  <div className={styles.errorActions}>
                    <button 
                      onClick={() => setStep('configure')}
                      className={styles.fixButton}
                    >
                      🔧 Fix Configuration
                    </button>
                    <button 
                      onClick={() => window.open(
                        aiConfig.provider === 'openrouter' ? 'https://openrouter.ai/keys' :
                        aiConfig.provider === 'openai' ? 'https://platform.openai.com/api-keys' :
                        aiConfig.provider === 'claude' ? 'https://console.anthropic.com' :
                        'https://openrouter.ai/keys', '_blank'
                      )}
                      className={styles.helpButton}
                    >
                      🔑 Get {aiConfig.provider === 'openrouter' ? 'OpenRouter' : aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'claude' ? 'Claude' : 'API'} Key
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.resultsActions}>
              <button onClick={exportToExcel} className={styles.primaryButton}>
                📊 Export to Excel
              </button>
              <button
                onClick={() => {
                  setStep('discover');
                  setResults(null);
                  setProcessingStats(null);
                  setDiscoveredSources([]);
                  setSitemapUrl('');
                }}
                className={styles.secondaryButton}
              >
                🔄 Start New Extraction
              </button>
            </div>

            {results && results.length > 0 && (
              <div className={styles.resultsTable}>
                <h3>📋 Preview ({results.length} records)</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Source URL</th>
                        {customFields.map(field => (
                          <th key={field.id}>{field.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 10).map((result, index) => (
                        <tr key={index}>
                          <td>
                            <a href={result.source_url} target="_blank" rel="noopener noreferrer">
                              {result.source_url.substring(0, 60)}...
                            </a>
                          </td>
                          {customFields.map(field => {
                            // Try multiple field name variations
                            const fieldValue = result[field.name] || 
                                               result[field.name.toLowerCase()] ||
                                               result[field.name.replace(/_/g, '')] ||
                                               result[field.name.replace(/_/g, ' ')] ||
                                               result[field.name.charAt(0).toUpperCase() + field.name.slice(1)] ||
                                               null;
                            
                            return (
                              <td key={field.id} title={`Looking for: ${field.name}`}>
                                {fieldValue || '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.length > 10 && (
                    <div className={styles.tableFooter}>
                      Showing 10 of {results.length} records. Export to Excel to see all data.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}