-- N8N SEO Automation Toolkit Database Schema
-- Extends existing workflow_templates table for comprehensive SEO automation

-- =====================================
-- WORKFLOW EXECUTION TABLES
-- =====================================

-- Workflow Runs - Track execution instances
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_type VARCHAR(20) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'api')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_data JSONB DEFAULT '{}',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node Executions - Track individual node runs within workflows
CREATE TABLE IF NOT EXISTS node_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER DEFAULT 0,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Schedules - For automated runs
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  next_run TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- SEO DATA TABLES
-- =====================================

-- Projects - SEO project management
CREATE TABLE IF NOT EXISTS seo_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  description TEXT,
  target_keywords TEXT[],
  target_locations TEXT[],
  competitors TEXT[],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keywords - Keyword tracking and research
CREATE TABLE IF NOT EXISTS seo_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES seo_projects(id) ON DELETE CASCADE,
  keyword VARCHAR(500) NOT NULL,
  search_volume INTEGER,
  keyword_difficulty INTEGER,
  cpc DECIMAL(10,2),
  competition_level VARCHAR(20),
  search_intent VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  country VARCHAR(10) DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, keyword, language, country)
);

-- Ranking Data - SERP position tracking
CREATE TABLE IF NOT EXISTS seo_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
  url VARCHAR(2000),
  position INTEGER,
  search_engine VARCHAR(20) DEFAULT 'google',
  location VARCHAR(100),
  device VARCHAR(20) DEFAULT 'desktop',
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  serp_features TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Analysis - Page content tracking
CREATE TABLE IF NOT EXISTS seo_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES seo_projects(id) ON DELETE CASCADE,
  url VARCHAR(2000) NOT NULL,
  title VARCHAR(500),
  meta_description VARCHAR(500),
  h1_tags TEXT[],
  h2_tags TEXT[],
  word_count INTEGER,
  content_hash VARCHAR(64),
  schema_markup JSONB,
  internal_links INTEGER DEFAULT 0,
  external_links INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  page_speed_score INTEGER,
  last_crawled TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backlinks - Link building tracking
CREATE TABLE IF NOT EXISTS seo_backlinks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES seo_projects(id) ON DELETE CASCADE,
  source_url VARCHAR(2000) NOT NULL,
  target_url VARCHAR(2000) NOT NULL,
  anchor_text VARCHAR(500),
  link_type VARCHAR(20) DEFAULT 'dofollow',
  domain_authority INTEGER,
  page_authority INTEGER,
  spam_score INTEGER,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'lost', 'nofollow', 'redirect')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitors - Competitor analysis
CREATE TABLE IF NOT EXISTS seo_competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES seo_projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  estimated_traffic INTEGER,
  domain_authority INTEGER,
  organic_keywords INTEGER,
  backlinks_count INTEGER,
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- AUTOMATION & REPORTING TABLES
-- =====================================

-- Reports - Generated reports storage
CREATE TABLE IF NOT EXISTS seo_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES seo_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled BOOLEAN DEFAULT false,
  schedule_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys - Store encrypted API credentials
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service VARCHAR(50) NOT NULL,
  key_name VARCHAR(100) NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service, key_name)
);

-- Notifications - System notifications and alerts
CREATE TABLE IF NOT EXISTS seo_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES seo_projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

-- Workflow execution indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_status ON workflow_runs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_run_id ON node_executions(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run ON workflow_schedules(next_run) WHERE is_active = true;

-- SEO data indexes
CREATE INDEX IF NOT EXISTS idx_seo_keywords_project ON seo_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_rankings_keyword_date ON seo_rankings(keyword_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_content_project_url ON seo_content(project_id, url);
CREATE INDEX IF NOT EXISTS idx_seo_backlinks_project ON seo_backlinks(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_competitors_project ON seo_competitors(project_id);

-- Reporting indexes
CREATE INDEX IF NOT EXISTS idx_seo_reports_project_type ON seo_reports(project_id, report_type);
CREATE INDEX IF NOT EXISTS idx_seo_notifications_user_unread ON seo_notifications(user_id, is_read);

-- =====================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_workflow_runs_updated_at BEFORE UPDATE ON workflow_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seo_projects_updated_at BEFORE UPDATE ON seo_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seo_keywords_updated_at BEFORE UPDATE ON seo_keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seo_content_updated_at BEFORE UPDATE ON seo_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seo_competitors_updated_at BEFORE UPDATE ON seo_competitors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_schedules_updated_at BEFORE UPDATE ON workflow_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();