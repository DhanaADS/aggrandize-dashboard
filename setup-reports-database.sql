-- ===================================
-- PAYMENT REPORTS SYSTEM - ESSENTIAL SCHEMA
-- Run this in your Supabase SQL Editor
-- ===================================

-- Monthly Reports Table
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_month TEXT NOT NULL,
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
  report_data JSONB,
  pdf_url TEXT,
  excel_url TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID REFERENCES auth.users(id)
);

-- Report Templates Table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('executive_summary', 'detailed_report', 'team_analysis', 'category_breakdown', 'custom')),
  template_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Report Generations Table
CREATE TABLE IF NOT EXISTS report_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_report_id UUID REFERENCES monthly_reports(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('manual', 'scheduled', 'bulk')),
  generation_status TEXT NOT NULL CHECK (generation_status IN ('started', 'data_collection', 'pdf_generation', 'completed', 'failed')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_details TEXT,
  processing_time_ms INTEGER,
  
  records_processed JSONB,
  data_quality_score INTEGER CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID REFERENCES auth.users(id)
);

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

CREATE INDEX IF NOT EXISTS idx_monthly_reports_month ON monthly_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_status ON monthly_reports(generation_status);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_type ON monthly_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_user ON monthly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);

-- ===================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;

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

-- Report Templates Policies
CREATE POLICY "Users can view active report templates" ON report_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage report templates" ON report_templates
  FOR ALL USING (
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

-- ===================================
-- DEFAULT TEMPLATE DATA
-- ===================================

INSERT INTO report_templates (name, description, template_type, template_config, is_default) 
VALUES
('Executive Summary', 'High-level monthly financial overview for executives', 'executive_summary', 
 '{"sections": ["summary_cards", "expense_chart", "category_breakdown", "key_metrics"], "style": "professional", "charts": true}'::jsonb, true),

('Detailed Financial Report', 'Complete transaction breakdown with all financial details', 'detailed_report', 
 '{"sections": ["summary", "expenses_detail", "salaries_detail", "subscriptions_detail", "settlements"], "style": "detailed", "include_receipts": false}'::jsonb, true),

('Team Analysis Report', 'Individual team member spending analysis and patterns', 'team_analysis', 
 '{"sections": ["team_summary", "individual_breakdowns", "settlement_status", "spending_patterns"], "style": "analytical", "charts": true}'::jsonb, true),

('Category Breakdown', 'Deep-dive analysis by expense categories and payment methods', 'category_breakdown', 
 '{"sections": ["category_summary", "payment_methods", "trends", "recommendations"], "style": "analytical", "charts": true}'::jsonb, true)
ON CONFLICT DO NOTHING;