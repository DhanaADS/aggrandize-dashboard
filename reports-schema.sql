-- ===================================
-- PAYMENT REPORTS SYSTEM SCHEMA
-- ===================================

-- Monthly Reports Table - Stores report metadata and summary data
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_month TEXT NOT NULL, -- YYYY-MM format
  report_type TEXT NOT NULL CHECK (report_type IN ('executive_summary', 'detailed_report', 'team_analysis', 'category_breakdown')),
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  
  -- Financial Summary Data
  total_expenses_inr NUMERIC(12,2) DEFAULT 0,
  total_expenses_usd NUMERIC(12,2) DEFAULT 0,
  total_salaries_inr NUMERIC(12,2) DEFAULT 0,
  total_salaries_usd NUMERIC(12,2) DEFAULT 0,
  total_subscriptions_inr NUMERIC(12,2) DEFAULT 0,
  total_subscriptions_usd NUMERIC(12,2) DEFAULT 0,
  total_utility_bills_inr NUMERIC(12,2) DEFAULT 0,
  total_utility_bills_usd NUMERIC(12,2) DEFAULT 0,
  total_settlements_pending_inr NUMERIC(12,2) DEFAULT 0,
  total_settlements_completed_inr NUMERIC(12,2) DEFAULT 0,
  
  -- Report Metadata
  report_data JSONB, -- Detailed breakdown data for PDF generation
  pdf_url TEXT, -- URL to generated PDF file
  excel_url TEXT, -- URL to generated Excel file
  error_message TEXT, -- Error details if generation failed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID REFERENCES auth.users(id)
);

-- Report Generation History - Track all generation attempts
CREATE TABLE report_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_report_id UUID REFERENCES monthly_reports(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('manual', 'scheduled', 'bulk')),
  generation_status TEXT NOT NULL CHECK (generation_status IN ('started', 'data_collection', 'pdf_generation', 'completed', 'failed')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_details TEXT,
  processing_time_ms INTEGER,
  
  -- Data Statistics
  records_processed JSONB, -- {"expenses": 45, "salaries": 12, etc.}
  data_quality_score INTEGER CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID REFERENCES auth.users(id)
);

-- Report Templates - Store custom report templates
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('executive_summary', 'detailed_report', 'team_analysis', 'category_breakdown', 'custom')),
  template_config JSONB NOT NULL, -- Template configuration and styling
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Report Subscriptions - For automated report generation
CREATE TABLE report_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('executive_summary', 'detailed_report', 'team_analysis', 'category_breakdown')),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  auto_generate BOOLEAN DEFAULT true,
  auto_email BOOLEAN DEFAULT false,
  email_recipients TEXT[], -- Array of email addresses
  
  next_generation_date DATE,
  last_generated_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

-- Monthly Reports Indexes
CREATE INDEX idx_monthly_reports_month ON monthly_reports(report_month);
CREATE INDEX idx_monthly_reports_status ON monthly_reports(generation_status);
CREATE INDEX idx_monthly_reports_type ON monthly_reports(report_type);
CREATE INDEX idx_monthly_reports_user ON monthly_reports(user_id);
CREATE INDEX idx_monthly_reports_created ON monthly_reports(created_at);

-- Report Generations Indexes
CREATE INDEX idx_report_generations_monthly_report ON report_generations(monthly_report_id);
CREATE INDEX idx_report_generations_status ON report_generations(generation_status);
CREATE INDEX idx_report_generations_created ON report_generations(created_at);

-- Report Templates Indexes
CREATE INDEX idx_report_templates_type ON report_templates(template_type);
CREATE INDEX idx_report_templates_active ON report_templates(is_active);

-- Report Subscriptions Indexes
CREATE INDEX idx_report_subscriptions_user ON report_subscriptions(user_id);
CREATE INDEX idx_report_subscriptions_active ON report_subscriptions(is_active);
CREATE INDEX idx_report_subscriptions_next_gen ON report_subscriptions(next_generation_date);

-- ===================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================

-- Enable RLS on all tables
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;

-- Monthly Reports Policies
CREATE POLICY "Users can view own monthly reports" ON monthly_reports
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create monthly reports" ON monthly_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly reports" ON monthly_reports
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete monthly reports" ON monthly_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Report Generations Policies
CREATE POLICY "Users can view related report generations" ON report_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM monthly_reports 
      WHERE id = monthly_report_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create report generations" ON report_generations
  FOR INSERT WITH CHECK (auth.uid() = generated_by);

-- Report Templates Policies (Admin only for now)
CREATE POLICY "Admins can manage report templates" ON report_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active report templates" ON report_templates
  FOR SELECT USING (is_active = true);

-- Report Subscriptions Policies
CREATE POLICY "Users can manage own subscriptions" ON report_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_monthly_reports_updated_at 
  BEFORE UPDATE ON monthly_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at 
  BEFORE UPDATE ON report_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_subscriptions_updated_at 
  BEFORE UPDATE ON report_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update generation status
CREATE OR REPLACE FUNCTION update_report_generation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.generation_status = 'completed' THEN
    UPDATE monthly_reports 
    SET generation_status = 'completed', generated_at = timezone('utc'::text, now())
    WHERE id = NEW.monthly_report_id;
  ELSIF NEW.generation_status = 'failed' THEN
    UPDATE monthly_reports 
    SET generation_status = 'failed', error_message = NEW.error_details
    WHERE id = NEW.monthly_report_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update monthly_reports status
CREATE TRIGGER update_monthly_report_status 
  AFTER UPDATE ON report_generations 
  FOR EACH ROW 
  WHEN (NEW.generation_status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_report_generation_status();

-- ===================================
-- DEFAULT DATA
-- ===================================

-- Insert default report templates
INSERT INTO report_templates (name, description, template_type, template_config, is_default) VALUES
('Executive Summary', 'High-level monthly financial overview for executives', 'executive_summary', 
 '{"sections": ["summary_cards", "expense_chart", "category_breakdown", "key_metrics"], "style": "professional", "charts": true}', true),

('Detailed Financial Report', 'Complete transaction breakdown with all financial details', 'detailed_report', 
 '{"sections": ["summary", "expenses_detail", "salaries_detail", "subscriptions_detail", "settlements"], "style": "detailed", "include_receipts": false}', true),

('Team Analysis Report', 'Individual team member spending analysis and patterns', 'team_analysis', 
 '{"sections": ["team_summary", "individual_breakdowns", "settlement_status", "spending_patterns"], "style": "analytical", "charts": true}', true),

('Category Breakdown', 'Deep-dive analysis by expense categories and payment methods', 'category_breakdown', 
 '{"sections": ["category_summary", "payment_methods", "trends", "recommendations"], "style": "analytical", "charts": true}', true);

-- ===================================
-- UTILITY VIEWS
-- ===================================

-- View for report dashboard
CREATE VIEW reports_dashboard AS
SELECT 
  mr.id,
  mr.report_month,
  mr.report_type,
  mr.generation_status,
  mr.total_expenses_inr + mr.total_salaries_inr + mr.total_subscriptions_inr + mr.total_utility_bills_inr as total_monthly_spend_inr,
  mr.created_at,
  mr.generated_at,
  up.full_name as generated_by_name,
  CASE 
    WHEN mr.generation_status = 'completed' THEN 'success'
    WHEN mr.generation_status = 'failed' THEN 'error'
    WHEN mr.generation_status = 'generating' THEN 'loading'
    ELSE 'pending'
  END as status_color
FROM monthly_reports mr
LEFT JOIN user_profiles up ON mr.generated_by = up.id
ORDER BY mr.report_month DESC, mr.created_at DESC;