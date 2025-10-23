import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Switch,
  FormControl,
  Card,
  CardContent,
  Stack,
  Chip,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Science as TestIcon,
  Hub as ScrapeIcon,
  Link as LinkIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface FieldConfig {
  name: string;
  type: 'text' | 'url' | 'date' | 'number' | 'array';
  description: string;
  required: boolean;
}

interface ScrapingConfig {
  targetUrl: string;
  strategy: {
    approach: 'single_page' | 'category_pagination' | 'search_results';
    pagination?: {
      maxPages: number;
      nextPageSelector?: string;
    };
  };
  fields: FieldConfig[];
}

export function ScrapingForm() {
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState('');
  const [articleLimit, setArticleLimit] = useState(3);
  const [aiModel, setAiModel] = useState('gpt-4-turbo');
  const [jsRendering, setJsRendering] = useState(true);
  const [timeout, setTimeout] = useState(60);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [suggestedFields, setSuggestedFields] = useState<FieldConfig[]>([]);
  const [selectedFields, setSelectedFields] = useState<FieldConfig[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Analyze prompt for field suggestions
  useEffect(() => {
    const analyzePrompt = async () => {
      if (prompt.length < 10) return;

      setIsAnalyzing(true);
      setApiError(null);
      try {
        const response = await fetch('/api/scraping/analyze-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        const data = await response.json();

        if (response.ok) {
          const config: ScrapingConfig = data;
          setSuggestedFields(config.fields || []);
          if (config.targetUrl && !url) {
            setUrl(config.targetUrl);
          }
        } else {
          setApiError(data.error || 'Failed to analyze prompt');
          // Provide default fields as fallback
          setSuggestedFields([
            { name: 'articleUrl', type: 'url', description: 'Direct link to the article', required: true },
            { name: 'title', type: 'text', description: 'Article title/headline', required: true },
            { name: 'date', type: 'date', description: 'Publication date', required: true },
            { name: 'companyName', type: 'text', description: 'Company name mentioned in article', required: false },
            { name: 'companyWebsite', type: 'url', description: 'Company website URL', required: false },
            { name: 'fundingAmount', type: 'text', description: 'Funding amount raised', required: false },
          ]);
        }
      } catch (error) {
        console.error('Error analyzing prompt:', error);
        setApiError('Network error. Please check your connection.');
        // Provide default fields as fallback
        setSuggestedFields([
          { name: 'articleUrl', type: 'url', description: 'Direct link to the article', required: true },
          { name: 'title', type: 'text', description: 'Article title/headline', required: true },
          { name: 'date', type: 'date', description: 'Publication date', required: true },
          { name: 'companyName', type: 'text', description: 'Company name mentioned in article', required: false },
        ]);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounceTimer = setTimeout(analyzePrompt, 1000);
    return () => clearTimeout(debounceTimer);
  }, [prompt, url]);

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scraping/execute?jobId=${jobId}`);
        const job = await response.json();
        setJobStatus(job);

        if (job.status === 'completed' || job.status === 'error') {
          clearInterval(interval);
          setIsScraping(false);
          if (job.status === 'completed') {
            setResults(job.results);
            setShowResults(true);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleTestPreview = async () => {
    // Test with just 1 article for preview
    const testLimit = 1;
    const config: ScrapingConfig = {
      targetUrl: url,
      strategy: {
        approach: 'category_pagination',
        pagination: { maxPages: 1 }, // Test with just 1 page
      },
      fields: selectedFields,
    };

    setIsScraping(true);
    try {
      const response = await fetch('/api/scraping/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          config,
          articleLimit: testLimit,
          isDemoMode // Pass demo mode flag
        }),
      });

      if (response.ok) {
        const { jobId } = await response.json();
        setJobId(jobId);
      }
    } catch (error) {
      console.error('Error starting test scraping:', error);
      setIsScraping(false);
    }
  };

  const handleStartScraping = async () => {
    const config: ScrapingConfig = {
      targetUrl: url,
      strategy: {
        approach: 'category_pagination',
        pagination: { maxPages: Math.ceil(articleLimit / 12) }, // Assuming ~12 articles per page
      },
      fields: selectedFields,
    };

    setIsScraping(true);
    try {
      const response = await fetch('/api/scraping/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          config,
          articleLimit,
          isDemoMode // Pass demo mode flag
        }),
      });

      if (response.ok) {
        const { jobId } = await response.json();
        setJobId(jobId);
      }
    } catch (error) {
      console.error('Error starting scraping:', error);
      setIsScraping(false);
    }
  };

  const handleExportCSV = async () => {
    if (!jobId) return;

    try {
      const response = await fetch('/api/scraping/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, fields: selectedFields }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraped_data_${jobId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const toggleField = (field: FieldConfig) => {
    setSelectedFields(prev => {
      const exists = prev.find(f => f.name === field.name);
      if (exists) {
        return prev.filter(f => f.name !== field.name);
      } else {
        return [...prev, field];
      }
    });
  };

  return (
    <Box>
      {/* URL Input */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 2 }}>
          Target URL
        </Typography>
        <TextField
          fullWidth
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 48,
              borderRadius: 2,
              bgcolor: 'background.default',
              '& fieldset': { borderWidth: 1, borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'primary.main' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
            },
            '& .MuiInputBase-input': { px: 2 }
          }}
        />

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
            Having trouble with real API? Try demo mode to save API credits
          </Typography>
        </Box>
      </Box>

      {/* AI Prompt */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 2 }}>
          What do you want to scrape?
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Example: Visit Finsmes USA category and extract article details including company names, funding amounts, and investor information..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.default',
              '& fieldset': { borderWidth: 1, borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'primary.main' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
            },
            '& .MuiInputBase-input': { px: 2, py: 2 }
          }}
        />

        {/* Article Limit */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 2 }}>
            Number of Articles to Scrape
          </Typography>
          <TextField
            type="number"
            value={articleLimit}
            onChange={(e) => setArticleLimit(Math.min(50, Math.max(1, Number(e.target.value))))}
            size="small"
            sx={{
              width: 120,
              '& .MuiOutlinedInput-root': {
                height: 40,
                borderRadius: 2,
                bgcolor: 'background.default',
                '& fieldset': { borderWidth: 1, borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'primary.main' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
              },
              '& .MuiInputBase-input': { textAlign: 'center' }
            }}
            InputProps={{ inputProps: { min: 1, max: 50 } }}
          />
        </Box>
      </Box>

      {/* API Error */}
      {apiError && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Using default field suggestions. You can modify them below.
          </Typography>
        </Box>
      )}

      {/* AI Field Suggestions */}
      {suggestedFields.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 2 }}>
            🤖 AI-Suggested Fields
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {suggestedFields.map((field) => (
              <Chip
                key={field.name}
                label={`${field.name} - ${field.description}`}
                onClick={() => toggleField(field)}
                color={selectedFields.find(f => f.name === field.name) ? 'primary' : 'default'}
                clickable
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Selected Fields */}
      {selectedFields.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 2 }}>
            Selected Fields ({selectedFields.length})
          </Typography>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {selectedFields.map((field) => (
                  <Chip
                    key={field.name}
                    label={field.name}
                    onDelete={() => toggleField(field)}
                    deleteIcon={<DeleteIcon />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Advanced Options */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 3 }}>
          Advanced Options
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight="medium">
              Enable JavaScript Rendering
            </Typography>
            <Switch
              checked={jsRendering}
              onChange={(e) => setJsRendering(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase': {
                  '&.Mui-checked': {
                    '& + .MuiSwitch-track': { bgcolor: 'primary.main' },
                  },
                },
                '& .MuiSwitch-track': { bgcolor: 'divider' },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight="medium">
              Request Timeout (seconds)
            </Typography>
            <TextField
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              size="small"
              sx={{
                width: 96,
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  '& fieldset': { borderWidth: 1, borderColor: 'divider' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
                },
                '& .MuiInputBase-input': { textAlign: 'center' }
              }}
              InputProps={{ inputProps: { min: 1, max: 300 } }}
            />
          </Box>
        </Box>
      </Box>

      {/* Demo Mode Toggle */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 3 }}>
          Scraping Mode
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: isDemoMode ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.05)' }}>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {isDemoMode ? '🎭 Demo Mode' : '🚀 Real API Mode'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isDemoMode
                ? 'Using simulated data - No API credits consumed'
                : 'Using real Decodo API - Credits will be consumed'
              }
            </Typography>
          </Box>
          <Switch
            checked={isDemoMode}
            onChange={(e) => setIsDemoMode(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase': {
                '&.Mui-checked': {
                  '& + .MuiSwitch-track': { bgcolor: '#10b981' },
                },
              },
              '& .MuiSwitch-track': { bgcolor: '#3b82f6' },
            }}
          />
        </Box>
        {!isDemoMode && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ⚠️ Real API mode will consume your Decodo API credits (1000 requests for 7 days).
              Each article scraped will use 1-2 API requests.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 3 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<TestIcon />}
          sx={{
            textTransform: 'none',
            py: 2,
            borderRadius: 2,
            fontWeight: 'bold',
            fontSize: '1rem',
            borderColor: 'primary.main',
            color: 'primary.main',
            bgcolor: 'rgba(19, 127, 236, 0.1)',
            '&:hover': {
              bgcolor: 'rgba(19, 127, 236, 0.2)',
              borderColor: 'primary.main'
            }
          }}
          onClick={handleTestPreview}
          disabled={!prompt || !url || selectedFields.length === 0 || isScraping}
        >
          Test & Preview
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<ScrapeIcon />}
          sx={{
            textTransform: 'none',
            py: 2,
            borderRadius: 2,
            fontWeight: 'bold',
            fontSize: '1rem',
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
          onClick={handleStartScraping}
          disabled={!prompt || !url || selectedFields.length === 0 || isScraping}
        >
          {isScraping ? 'Scraping...' : 'Start Scraping'}
        </Button>
      </Box>

      {/* Progress Dialog */}
      <Dialog open={isScraping && !!jobStatus} maxWidth="sm" fullWidth>
        <DialogTitle>Scraping in Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {jobStatus?.progress?.message || 'Starting...'}
            </Typography>
            {jobStatus?.progress && (
              <>
                <LinearProgress
                  variant="determinate"
                  value={(jobStatus.progress.current / jobStatus.progress.total) * 100}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Progress: {jobStatus.progress.current} / {jobStatus.progress.total}
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsScraping(false)}>Cancel</Button>
          {jobStatus?.status === 'completed' && (
            <Button variant="contained" onClick={() => setShowResults(true)}>
              View Results
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResults} maxWidth="lg" fullWidth>
        <DialogTitle>
          Scraping Results ({results.length} items)
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ ml: 2 }}
          >
            Export CSV
          </Button>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {selectedFields.map((field) => (
                    <TableCell key={field.name}>{field.name}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row, index) => (
                  <TableRow key={index}>
                    {selectedFields.map((field) => (
                      <TableCell key={field.name}>
                        {Array.isArray(row[field.name])
                          ? row[field.name].join(', ')
                          : row[field.name] || '-'
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}