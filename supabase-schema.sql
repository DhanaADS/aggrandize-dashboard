-- Create user_profiles table
create table user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'marketing', 'processing')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on user_profiles
alter table user_profiles enable row level security;

-- Create policies for user_profiles
create policy "Users can view own profile" on user_profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles" on user_profiles
  for select using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'processing')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on profile changes
create trigger on_user_profile_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

-- Create workflow_templates table for Scryptr
create table workflow_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete cascade not null,
  is_public boolean default false,
  
  -- Workflow configuration
  title_rules jsonb default '[]'::jsonb,
  body_rules jsonb default '[]'::jsonb,
  url_rules jsonb default '[]'::jsonb,
  title_logic text default 'OR' check (title_logic in ('AND', 'OR')),
  body_logic text default 'OR' check (body_logic in ('AND', 'OR')),
  url_logic text default 'OR' check (url_logic in ('AND', 'OR')),
  
  -- AI configuration
  ai_config jsonb not null default '{
    "apiProvider": "openrouter",
    "model": "qwen/qwen3-8b:free",
    "customPrompt": "For each article, extract the following information:\n- title: The article headline\n- summary: 2-sentence summary of the main points\n- author: Author name if available\n- publication_date: When the article was published\n- main_topic: Primary topic/category (1-2 words)\n- sentiment: Overall tone (Positive, Negative, Neutral)\n- key_companies: Companies mentioned (comma-separated)\n- keywords: 5 most important keywords (comma-separated)",
    "dataFields": ["title", "summary", "author", "publication_date", "main_topic", "sentiment", "key_companies", "keywords"]
  }'::jsonb,
  
  -- Filters configuration
  filters jsonb not null default '{
    "maxArticles": 50,
    "dateRange": 30,
    "keywords": ""
  }'::jsonb,
  
  -- Metadata
  usage_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on workflow_templates
alter table workflow_templates enable row level security;

-- Create policies for workflow_templates
create policy "Users can view own templates" on workflow_templates
  for select using (auth.uid() = created_by);

create policy "Users can view public templates" on workflow_templates
  for select using (is_public = true);

create policy "Users can create templates" on workflow_templates
  for insert with check (auth.uid() = created_by);

create policy "Users can update own templates" on workflow_templates
  for update using (auth.uid() = created_by);

create policy "Users can delete own templates" on workflow_templates
  for delete using (auth.uid() = created_by);

-- Trigger to update updated_at on template changes
create trigger on_workflow_template_updated
  before update on public.workflow_templates
  for each row execute procedure public.handle_updated_at();

-- Function to increment usage count
create or replace function public.increment_template_usage(template_id uuid)
returns void as $$
begin
  update workflow_templates 
  set usage_count = usage_count + 1 
  where id = template_id;
end;
$$ language plpgsql security definer;

-- Insert default templates
insert into workflow_templates (
  name, 
  description, 
  created_by, 
  is_public,
  title_rules,
  body_rules,
  ai_config,
  filters
) values 
(
  'Tech Startup News',
  'Extract information about technology startups, funding, and new products',
  (select id from auth.users where email = 'dhana@aggrandizedigital.com' limit 1),
  true,
  '[
    {"id": "1", "type": "contains", "value": "startup", "caseSensitive": false},
    {"id": "2", "type": "contains", "value": "funding", "caseSensitive": false},
    {"id": "3", "type": "contains", "value": "investment", "caseSensitive": false}
  ]'::jsonb,
  '[
    {"id": "1", "type": "contains", "value": "technology", "caseSensitive": false},
    {"id": "2", "type": "contains", "value": "AI", "caseSensitive": false},
    {"id": "3", "type": "contains", "value": "software", "caseSensitive": false}
  ]'::jsonb,
  '{
    "apiProvider": "openrouter",
    "model": "qwen/qwen3-8b:free",
    "customPrompt": "For each tech startup article, extract:\n- company_name: Name of the startup/company\n- funding_amount: Amount of funding raised (if mentioned)\n- funding_stage: Seed, Series A, B, C, etc.\n- investors: Names of investors or VCs\n- product_description: Brief description of the product/service\n- industry: Primary industry or sector\n- location: Company headquarters location\n- key_metrics: Important numbers mentioned",
    "dataFields": ["company_name", "funding_amount", "funding_stage", "investors", "product_description", "industry", "location", "key_metrics"]
  }'::jsonb,
  '{
    "maxArticles": 100,
    "dateRange": 7,
    "keywords": "startup, funding, investment, tech"
  }'::jsonb
),
(
  'AI & Machine Learning',
  'Focus on artificial intelligence, machine learning, and emerging tech trends',
  (select id from auth.users where email = 'dhana@aggrandizedigital.com' limit 1),
  true,
  '[
    {"id": "1", "type": "contains", "value": "AI", "caseSensitive": false},
    {"id": "2", "type": "contains", "value": "artificial intelligence", "caseSensitive": false},
    {"id": "3", "type": "contains", "value": "machine learning", "caseSensitive": false},
    {"id": "4", "type": "contains", "value": "neural network", "caseSensitive": false}
  ]'::jsonb,
  '[]'::jsonb,
  '{
    "apiProvider": "openrouter",
    "model": "qwen/qwq-32b:free",
    "customPrompt": "For each AI/ML article, extract:\n- technology_type: Specific AI/ML technology discussed\n- use_case: Primary application or use case\n- companies_involved: Companies developing or using the technology\n- breakthrough_claim: Any claimed breakthrough or advancement\n- limitations: Mentioned limitations or challenges\n- research_stage: Research, prototype, production, etc.\n- potential_impact: Described impact on industry or society",
    "dataFields": ["technology_type", "use_case", "companies_involved", "breakthrough_claim", "limitations", "research_stage", "potential_impact"]
  }'::jsonb,
  '{
    "maxArticles": 75,
    "dateRange": 14,
    "keywords": "AI, machine learning, neural network, deep learning"
  }'::jsonb
);

-- Insert the predefined users (you'll need to run this after creating the accounts)
-- Note: These will be created through the Supabase Auth interface first
-- ==========================================
-- MAILFORGE EMAIL MANAGEMENT SYSTEM
-- ==========================================

-- Main contacts/leads table for MailForge
CREATE TABLE mailforge_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  niche text,
  website text,
  client_type text,
  date_interaction text,
  price_range text,
  order_status text DEFAULT 'new',
  confidence decimal(3,2) DEFAULT 0.0,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_activity timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Constraints
  CONSTRAINT unique_email_per_user UNIQUE(user_id, email),
  CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- Indexes for better performance
CREATE INDEX idx_mailforge_contacts_user_id ON mailforge_contacts(user_id);
CREATE INDEX idx_mailforge_contacts_email ON mailforge_contacts(email);
CREATE INDEX idx_mailforge_contacts_order_status ON mailforge_contacts(order_status);
CREATE INDEX idx_mailforge_contacts_client_type ON mailforge_contacts(client_type);
CREATE INDEX idx_mailforge_contacts_created_at ON mailforge_contacts(created_at);

-- Enable RLS on mailforge_contacts
ALTER TABLE mailforge_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can manage their own contacts" ON mailforge_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Email campaigns table
CREATE TABLE mailforge_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  bounce_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for campaigns
CREATE INDEX idx_mailforge_campaigns_user_id ON mailforge_campaigns(user_id);
CREATE INDEX idx_mailforge_campaigns_status ON mailforge_campaigns(status);
CREATE INDEX idx_mailforge_campaigns_created_at ON mailforge_campaigns(created_at);

-- Enable RLS on mailforge_campaigns
ALTER TABLE mailforge_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can manage their own campaigns" ON mailforge_campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Campaign recipients table (links campaigns to contacts)
CREATE TABLE mailforge_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES mailforge_campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES mailforge_contacts(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  personalized_subject text,
  personalized_content text,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_campaign_contact UNIQUE(campaign_id, contact_id)
);

-- Indexes for campaign recipients
CREATE INDEX idx_mailforge_campaign_recipients_campaign_id ON mailforge_campaign_recipients(campaign_id);
CREATE INDEX idx_mailforge_campaign_recipients_contact_id ON mailforge_campaign_recipients(contact_id);
CREATE INDEX idx_mailforge_campaign_recipients_status ON mailforge_campaign_recipients(status);

-- Enable RLS on mailforge_campaign_recipients
ALTER TABLE mailforge_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign recipients
CREATE POLICY "Users can manage recipients for their campaigns" ON mailforge_campaign_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mailforge_campaigns c 
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

-- Email templates table
CREATE TABLE mailforge_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for templates
CREATE INDEX idx_mailforge_templates_user_id ON mailforge_templates(user_id);
CREATE INDEX idx_mailforge_templates_category ON mailforge_templates(category);
CREATE INDEX idx_mailforge_templates_is_public ON mailforge_templates(is_public);

-- Enable RLS on mailforge_templates
ALTER TABLE mailforge_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view their own templates" ON mailforge_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON mailforge_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create templates" ON mailforge_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON mailforge_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON mailforge_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER on_mailforge_contacts_updated
  BEFORE UPDATE ON public.mailforge_contacts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_mailforge_campaigns_updated
  BEFORE UPDATE ON public.mailforge_campaigns
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_mailforge_templates_updated
  BEFORE UPDATE ON public.mailforge_templates
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to increment template usage
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE mailforge_templates 
  SET usage_count = usage_count + 1 
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION public.update_campaign_stats(campaign_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE mailforge_campaigns 
  SET 
    recipient_count = (
      SELECT COUNT(*) FROM mailforge_campaign_recipients 
      WHERE campaign_id = campaign_id
    ),
    sent_count = (
      SELECT COUNT(*) FROM mailforge_campaign_recipients 
      WHERE campaign_id = campaign_id AND status IN ('sent', 'delivered', 'opened', 'clicked')
    ),
    open_count = (
      SELECT COUNT(*) FROM mailforge_campaign_recipients 
      WHERE campaign_id = campaign_id AND status IN ('opened', 'clicked')
    ),
    click_count = (
      SELECT COUNT(*) FROM mailforge_campaign_recipients 
      WHERE campaign_id = campaign_id AND status = 'clicked'
    ),
    bounce_count = (
      SELECT COUNT(*) FROM mailforge_campaign_recipients 
      WHERE campaign_id = campaign_id AND status = 'bounced'
    )
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample email templates
INSERT INTO mailforge_templates (user_id, name, description, subject, content, category, is_public) 
VALUES 
(
  (SELECT id FROM auth.users WHERE email = 'dhana@aggrandizedigital.com' LIMIT 1),
  'Welcome Series - Direct Client',
  'Welcome email for new direct clients',
  'Welcome to {{company_name}}, {{name}}!',
  '<h2>Welcome {{name}}!</h2><p>Thank you for your interest in our {{niche}} services. We''re excited to help you achieve your goals.</p><p>Next steps:</p><ul><li>Schedule a discovery call</li><li>Review our case studies</li><li>Discuss your specific needs</li></ul><p>Best regards,<br>The Team</p>',
  'welcome',
  true
),
(
  (SELECT id FROM auth.users WHERE email = 'dhana@aggrandizedigital.com' LIMIT 1),
  'Follow-up - Proposal Sent',
  'Follow-up email after sending a proposal',
  'Questions about your {{niche}} proposal?',
  '<h2>Hi {{name}},</h2><p>I wanted to follow up on the {{niche}} proposal I sent over on {{date}}.</p><p>Do you have any questions about:</p><ul><li>Our approach and methodology</li><li>Timeline and deliverables</li><li>Investment and payment terms</li></ul><p>I''m here to clarify anything and discuss how we can move forward.</p><p>Best,<br>Team</p>',
  'follow-up',
  true
),
(
  (SELECT id FROM auth.users WHERE email = 'dhana@aggrandizedigital.com' LIMIT 1),
  'High-Value Client Outreach',
  'Premium outreach for high-budget prospects',
  'Exclusive {{niche}} solution for {{name}}',
  '<h2>{{name}},</h2><p>I noticed you''re working in {{niche}} and thought you might be interested in our premium solution.</p><p>We''ve helped similar businesses:</p><ul><li>Increase ROI by 300%</li><li>Save 20+ hours per week</li><li>Scale operations efficiently</li></ul><p>Given your budget range of {{price_range}}, I''d love to show you our executive package.</p><p>Would you have 15 minutes this week for a quick call?</p><p>Best regards,<br>Premium Services Team</p>',
  'outreach',
  true
);

-- User permissions table for granular access control
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  can_access_order boolean DEFAULT false,
  can_access_processing boolean DEFAULT false,
  can_access_inventory boolean DEFAULT false,
  can_access_tools boolean DEFAULT false,
  can_access_payments boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_user_email UNIQUE(user_email)
);

-- Indexes for user_permissions
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_user_email ON user_permissions(user_email);

-- Enable RLS on user_permissions
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_permissions
CREATE POLICY "Admins can manage all user permissions" ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER on_user_permissions_updated
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================
-- FINANCE MANAGEMENT SYSTEM
-- ==========================================

-- Expense categories table
CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('salary', 'utilities', 'business_services', 'other')),
  color text DEFAULT '#3B82F6',
  icon text DEFAULT '💰',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payment methods table
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('office_card', 'sevan_card', 'cash', 'bank_transfer')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Expenses table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_inr decimal(12,2) NOT NULL,
  amount_usd decimal(12,2),
  category_id uuid REFERENCES expense_categories(id) NOT NULL,
  person_paid text NOT NULL,
  person_responsible text,
  purpose text NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id) NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'approved', 'rejected')),
  expense_date date NOT NULL,
  receipt_url text,
  notes text,
  validated_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  plan_type text NOT NULL,
  purpose text NOT NULL,
  amount_inr decimal(10,2) NOT NULL,
  amount_usd decimal(10,2) NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id) NOT NULL,
  renewal_cycle text NOT NULL CHECK (renewal_cycle IN ('Monthly', 'Yearly', 'Quarterly')),
  due_date date NOT NULL,
  next_due_date date NOT NULL,
  auto_renewal boolean DEFAULT false,
  is_active boolean DEFAULT true,
  category text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Settlements table (for tracking payments between team members)
CREATE TABLE settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_person text NOT NULL,
  to_person text NOT NULL,
  amount_inr decimal(10,2) NOT NULL,
  purpose text NOT NULL,
  settlement_status text DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'completed', 'cancelled')),
  settlement_date date,
  related_expense_id uuid REFERENCES expenses(id),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Salaries table (for tracking team member salaries)
CREATE TABLE salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_name text NOT NULL,
  amount_inr decimal(12,2) NOT NULL,
  amount_usd decimal(12,2),
  payment_method_id uuid REFERENCES payment_methods(id) NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'approved', 'rejected')),
  salary_month text NOT NULL, -- YYYY-MM format
  payment_date date,
  salary_type text DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'bonus', 'advance', 'deduction')),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Utility Bills table (for tracking utility bills)
CREATE TABLE utility_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bill_type text NOT NULL CHECK (bill_type IN ('internet', 'electricity', 'water', 'gas', 'phone', 'other')),
  provider_name text NOT NULL,
  amount_inr decimal(12,2) NOT NULL,
  amount_usd decimal(12,2),
  payment_method_id uuid REFERENCES payment_methods(id) NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  bill_month text NOT NULL, -- YYYY-MM format
  due_date date NOT NULL,
  payment_date date,
  bill_number text,
  usage_details text,
  notes text,
  paid_by text, -- Who paid this bill
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for better performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_due_date ON subscriptions(due_date);
CREATE INDEX idx_subscriptions_is_active ON subscriptions(is_active);

CREATE INDEX idx_settlements_from_person ON settlements(from_person);
CREATE INDEX idx_settlements_to_person ON settlements(to_person);
CREATE INDEX idx_settlements_status ON settlements(settlement_status);

CREATE INDEX idx_salaries_user_id ON salaries(user_id);
CREATE INDEX idx_salaries_employee_name ON salaries(employee_name);
CREATE INDEX idx_salaries_salary_month ON salaries(salary_month);
CREATE INDEX idx_salaries_payment_status ON salaries(payment_status);

CREATE INDEX idx_utility_bills_user_id ON utility_bills(user_id);
CREATE INDEX idx_utility_bills_bill_type ON utility_bills(bill_type);
CREATE INDEX idx_utility_bills_provider_name ON utility_bills(provider_name);
CREATE INDEX idx_utility_bills_bill_month ON utility_bills(bill_month);
CREATE INDEX idx_utility_bills_due_date ON utility_bills(due_date);
CREATE INDEX idx_utility_bills_payment_status ON utility_bills(payment_status);

-- Enable RLS on all tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view expense categories" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage expense categories" ON expense_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Everyone can view payment methods" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment methods" ON payment_methods FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view all expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Users can create expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all expenses" ON expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view all subscriptions" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can create subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view all settlements" ON settlements FOR SELECT USING (true);
CREATE POLICY "Users can create settlements" ON settlements FOR INSERT USING (true);
CREATE POLICY "Users can update settlements they're involved in" ON settlements FOR UPDATE USING (
  from_person = (SELECT email FROM user_profiles WHERE id = auth.uid()) OR
  to_person = (SELECT email FROM user_profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view all salaries" ON salaries FOR SELECT USING (true);
CREATE POLICY "Users can create salaries" ON salaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own salaries" ON salaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all salaries" ON salaries FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view all utility bills" ON utility_bills FOR SELECT USING (true);
CREATE POLICY "Users can create utility bills" ON utility_bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own utility bills" ON utility_bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all utility bills" ON utility_bills FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Triggers for updated_at timestamps
CREATE TRIGGER on_expense_categories_updated
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_expenses_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_settlements_updated
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_salaries_updated
  BEFORE UPDATE ON public.salaries
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_utility_bills_updated
  BEFORE UPDATE ON public.utility_bills
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insert default expense categories
INSERT INTO expense_categories (name, type, color, icon) VALUES
('Salary/Rent', 'salary', '#10B981', '💰'),
('Internet', 'utilities', '#3B82F6', '🌐'),
('EB Bill', 'utilities', '#F59E0B', '⚡'),
('Business Email', 'business_services', '#8B5CF6', '📧'),
('Other Expenses', 'other', '#6B7280', '📋');

-- Insert default payment methods
INSERT INTO payment_methods (name, type) VALUES
('Office Card', 'office_card'),
('Cash', 'cash'),
('Bank Transfer', 'bank_transfer');

-- ==========================================
-- EMPLOYEE SALARY MANAGEMENT SYSTEM
-- ==========================================

-- Add employee-related columns to existing user_profiles table
ALTER TABLE user_profiles ADD COLUMN employee_no text UNIQUE;
ALTER TABLE user_profiles ADD COLUMN monthly_salary_inr decimal(12,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN designation text;
ALTER TABLE user_profiles ADD COLUMN joining_date date;
ALTER TABLE user_profiles ADD COLUMN bank_account text;
ALTER TABLE user_profiles ADD COLUMN bank_name text;
ALTER TABLE user_profiles ADD COLUMN ifsc_code text;
ALTER TABLE user_profiles ADD COLUMN pan_no text;

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_employee_no ON user_profiles(employee_no);
CREATE INDEX idx_user_profiles_salary ON user_profiles(monthly_salary_inr);

-- Salary increment history table
CREATE TABLE salary_increments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  previous_salary_inr decimal(12,2) NOT NULL,
  new_salary_inr decimal(12,2) NOT NULL,
  increment_amount decimal(12,2) NOT NULL,
  increment_percentage decimal(5,2),
  effective_date date NOT NULL,
  reason text DEFAULT 'manual_update',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on salary_increments
ALTER TABLE salary_increments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_increments
CREATE POLICY "Admins can manage salary increments" ON salary_increments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view their own salary history" ON salary_increments
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes for salary_increments
CREATE INDEX idx_salary_increments_user_id ON salary_increments(user_id);
CREATE INDEX idx_salary_increments_effective_date ON salary_increments(effective_date);

-- Trigger for updated_at timestamp on salary increments
CREATE TRIGGER on_salary_increments_updated
  BEFORE UPDATE ON public.salary_increments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to update employee salary with history tracking
CREATE OR REPLACE FUNCTION public.update_employee_salary(
  p_user_id uuid,
  p_new_salary decimal(12,2),
  p_effective_date date DEFAULT CURRENT_DATE,
  p_reason text DEFAULT 'manual_update',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_previous_salary decimal(12,2);
  v_increment_id uuid;
BEGIN
  -- Get current salary
  SELECT monthly_salary_inr INTO v_previous_salary 
  FROM user_profiles 
  WHERE id = p_user_id;
  
  -- Only create increment record if salary actually changed
  IF v_previous_salary != p_new_salary THEN
    -- Insert salary increment record
    INSERT INTO salary_increments (
      user_id, 
      previous_salary_inr, 
      new_salary_inr, 
      increment_amount,
      increment_percentage,
      effective_date, 
      reason, 
      notes,
      created_by
    ) VALUES (
      p_user_id,
      v_previous_salary,
      p_new_salary,
      p_new_salary - v_previous_salary,
      CASE 
        WHEN v_previous_salary > 0 THEN ROUND(((p_new_salary - v_previous_salary) / v_previous_salary * 100), 2)
        ELSE 0 
      END,
      p_effective_date,
      p_reason,
      p_notes,
      auth.uid()
    ) RETURNING id INTO v_increment_id;
    
    -- Update current salary
    UPDATE user_profiles 
    SET monthly_salary_inr = p_new_salary
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_increment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
Expected users to create in Supabase Auth with employee data:
1. dhana@aggrandizedigital.com (admin) - ADS004 - ₹33,000
2. veera@aggrandizedigital.com (marketing) - ADS001 - ₹300,000
3. saravana@aggrandizedigital.com (marketing) - ADS002 - ₹50,000
4. saran@aggrandizedigital.com (marketing) - ADS003 - ₹50,000
5. abbas@aggrandizedigital.com (processing) - ADS005 - ₹34,500
6. gokul@aggrandizedigital.com (processing) - ADS006 - ₹27,500

After creating users in auth, run the employee data population script below.
*/

-- Populate existing users with employee data (run after users are created)
-- Note: These updates should be run after the auth users exist

-- Update Dhana (Admin)
UPDATE user_profiles SET 
  employee_no = 'ADS004',
  monthly_salary_inr = 33000.00,
  designation = 'Chief Technology Officer',
  joining_date = '2020-01-01',
  pan_no = 'AXXPD0000X',
  bank_name = 'State Bank of India',
  bank_account = '1234567890',
  ifsc_code = 'SBIN0001234'
WHERE email = 'dhana@aggrandizedigital.com';

-- Update Veera (Marketing - Business Development)
UPDATE user_profiles SET 
  employee_no = 'ADS001',
  monthly_salary_inr = 300000.00,
  designation = 'Business Development Manager',
  joining_date = '2019-06-15',
  pan_no = 'AXXPV0000Y',
  bank_name = 'HDFC Bank',
  bank_account = '1234567891',
  ifsc_code = 'HDFC0001234'
WHERE email = 'veera@aggrandizedigital.com';

-- Update Saravana (Marketing)
UPDATE user_profiles SET 
  employee_no = 'ADS002',
  monthly_salary_inr = 50000.00,
  designation = 'Marketing Executive',
  joining_date = '2021-03-10',
  pan_no = 'AXXPS0000Z',
  bank_name = 'ICICI Bank',
  bank_account = '1234567892',
  ifsc_code = 'ICIC0001234'
WHERE email = 'saravana@aggrandizedigital.com';

-- Update Saran (Marketing)
UPDATE user_profiles SET 
  employee_no = 'ADS003',
  monthly_salary_inr = 50000.00,
  designation = 'Marketing Executive',
  joining_date = '2021-04-05',
  pan_no = 'AXXPK0000A',
  bank_name = 'Axis Bank',
  bank_account = '1234567893',
  ifsc_code = 'UTIB0001234'
WHERE email = 'saran@aggrandizedigital.com';

-- Update Abbas (Processing)
UPDATE user_profiles SET 
  employee_no = 'ADS005',
  monthly_salary_inr = 34500.00,
  designation = 'Content Specialist',
  joining_date = '2022-01-15',
  pan_no = 'AXXPA0000B',
  bank_name = 'Kotak Mahindra Bank',
  bank_account = '1234567894',
  ifsc_code = 'KKBK0001234'
WHERE email = 'abbas@aggrandizedigital.com';

-- Update Gokul (Processing)
UPDATE user_profiles SET 
  employee_no = 'ADS006',
  monthly_salary_inr = 27500.00,
  designation = 'Content Specialist',
  joining_date = '2022-02-20',
  pan_no = 'AXXPG0000C',
  bank_name = 'Punjab National Bank',
  bank_account = '1234567895',
  ifsc_code = 'PUNB0001234'
WHERE email = 'gokul@aggrandizedigital.com';

-- =====================================================
-- MONTHLY SALARY PAYMENTS TRACKING SYSTEM
-- =====================================================

-- Create monthly_salary_payments table to track payment status per employee per month
CREATE TABLE monthly_salary_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  payment_month text NOT NULL, -- Format: 'YYYY-MM'
  payment_status text NOT NULL DEFAULT 'not_paid' CHECK (payment_status IN ('paid', 'not_paid')),
  payment_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(employee_id, payment_month)
);

-- Enable RLS on monthly_salary_payments
ALTER TABLE monthly_salary_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_salary_payments (Admin only access)
CREATE POLICY "Admins can view all salary payments" ON monthly_salary_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert salary payments" ON monthly_salary_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update salary payments" ON monthly_salary_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER on_monthly_salary_payments_updated
  BEFORE UPDATE ON public.monthly_salary_payments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_monthly_salary_payments_employee_month ON monthly_salary_payments(employee_id, payment_month);
CREATE INDEX idx_monthly_salary_payments_month ON monthly_salary_payments(payment_month);
CREATE INDEX idx_monthly_salary_payments_status ON monthly_salary_payments(payment_status);