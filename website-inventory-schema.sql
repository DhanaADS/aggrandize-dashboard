-- Website Inventory Management Schema
-- Digital Marketing Website Inventory with SEO metrics and content policy flags

CREATE TABLE IF NOT EXISTS website_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website VARCHAR(255) UNIQUE NOT NULL,
  contact VARCHAR(255),
  client_price DECIMAL(10,2),
  price DECIMAL(10,2),
  domain_rating INTEGER CHECK (domain_rating >= 0 AND domain_rating <= 100),
  da INTEGER CHECK (da >= 0 AND da <= 100),
  backlinks INTEGER DEFAULT 0,
  organic_traffic INTEGER DEFAULT 0,
  us_traffic INTEGER DEFAULT 0,
  uk_traffic INTEGER DEFAULT 0,
  canada_traffic INTEGER DEFAULT 0,
  is_indexed BOOLEAN DEFAULT true,
  ai_overview BOOLEAN DEFAULT false,
  chatgpt BOOLEAN DEFAULT false,
  perplexity BOOLEAN DEFAULT false,
  gemini BOOLEAN DEFAULT false,
  copilot BOOLEAN DEFAULT false,
  do_follow BOOLEAN DEFAULT true,
  news BOOLEAN DEFAULT false,
  sponsored BOOLEAN DEFAULT false,
  cbd BOOLEAN DEFAULT false,
  casino BOOLEAN DEFAULT false,
  dating BOOLEAN DEFAULT false,
  crypto BOOLEAN DEFAULT false,
  category VARCHAR(100),
  tat INTEGER DEFAULT 0, -- Turnaround time in days
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'blacklisted')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_website_inventory_website ON website_inventory(website);
CREATE INDEX IF NOT EXISTS idx_website_inventory_domain_rating ON website_inventory(domain_rating);
CREATE INDEX IF NOT EXISTS idx_website_inventory_da ON website_inventory(da);
CREATE INDEX IF NOT EXISTS idx_website_inventory_category ON website_inventory(category);
CREATE INDEX IF NOT EXISTS idx_website_inventory_status ON website_inventory(status);
CREATE INDEX IF NOT EXISTS idx_website_inventory_client_price ON website_inventory(client_price);
CREATE INDEX IF NOT EXISTS idx_website_inventory_organic_traffic ON website_inventory(organic_traffic);

-- Create composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_website_inventory_authority ON website_inventory(domain_rating, da);
CREATE INDEX IF NOT EXISTS idx_website_inventory_traffic ON website_inventory(organic_traffic, us_traffic);
CREATE INDEX IF NOT EXISTS idx_website_inventory_niche_flags ON website_inventory(cbd, casino, dating, crypto);
CREATE INDEX IF NOT EXISTS idx_website_inventory_content_flags ON website_inventory(news, sponsored, do_follow);
CREATE INDEX IF NOT EXISTS idx_website_inventory_ai_flags ON website_inventory(chatgpt, ai_overview, perplexity, gemini, copilot);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_inventory_updated_at 
  BEFORE UPDATE ON website_inventory 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE website_inventory ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all websites
CREATE POLICY "Allow authenticated read access" ON website_inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert websites
CREATE POLICY "Allow authenticated insert access" ON website_inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update websites they can access
CREATE POLICY "Allow authenticated update access" ON website_inventory
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow users to delete websites (admin only via application logic)
CREATE POLICY "Allow authenticated delete access" ON website_inventory
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample data for testing
INSERT INTO website_inventory (
  website, contact, client_price, price, domain_rating, da, backlinks, 
  organic_traffic, us_traffic, uk_traffic, canada_traffic, is_indexed,
  ai_overview, chatgpt, perplexity, gemini, copilot, do_follow, news, 
  sponsored, cbd, casino, dating, crypto, category, tat, status
) VALUES 
-- Tech websites
('techcrunch.com', 'editor@techcrunch.com', 5000.00, 4500.00, 92, 91, 2500000, 45000000, 18000000, 3500000, 1200000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Technology', 3, 'active'),
('wired.com', 'contact@wired.com', 4500.00, 4000.00, 89, 87, 1800000, 35000000, 15000000, 2800000, 980000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Technology', 5, 'active'),
('theverge.com', 'tips@theverge.com', 4200.00, 3800.00, 88, 86, 1600000, 32000000, 14000000, 2600000, 950000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Technology', 4, 'active'),

-- Finance websites  
('bloomberg.com', 'news@bloomberg.com', 8000.00, 7500.00, 95, 94, 3200000, 65000000, 25000000, 4500000, 1800000, true, false, false, false, false, false, true, true, true, false, false, false, true, 'Finance', 2, 'active'),
('reuters.com', 'contact@reuters.com', 7500.00, 7000.00, 94, 93, 3000000, 58000000, 22000000, 4200000, 1600000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Finance', 3, 'active'),
('coindesk.com', 'editorial@coindesk.com', 3500.00, 3200.00, 82, 81, 850000, 12000000, 5500000, 950000, 420000, true, false, false, false, false, false, true, true, true, false, false, false, true, 'Finance', 2, 'active'),

-- Health websites
('healthline.com', 'editorial@healthline.com', 3800.00, 3500.00, 86, 84, 1200000, 28000000, 15000000, 2100000, 890000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Health', 7, 'active'),
('webmd.com', 'contact@webmd.com', 4000.00, 3700.00, 87, 85, 1300000, 31000000, 18000000, 2300000, 920000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Health', 5, 'active'),

-- Lifestyle websites
('buzzfeed.com', 'tips@buzzfeed.com', 2500.00, 2200.00, 79, 78, 950000, 18000000, 8500000, 1200000, 650000, true, true, true, false, false, false, true, true, true, false, false, false, false, 'Lifestyle', 1, 'active'),
('huffpost.com', 'news@huffpost.com', 2800.00, 2500.00, 81, 80, 1100000, 22000000, 9500000, 1500000, 720000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Lifestyle', 3, 'active'),

-- Gaming websites
('ign.com', 'editorial@ign.com', 3200.00, 2900.00, 84, 83, 1050000, 24000000, 12000000, 1800000, 780000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Gaming', 4, 'active'),
('gamespot.com', 'news@gamespot.com', 2900.00, 2600.00, 82, 81, 980000, 19000000, 9800000, 1600000, 690000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Gaming', 5, 'active'),

-- Business websites
('entrepreneur.com', 'editorial@entrepreneur.com', 3600.00, 3300.00, 85, 84, 1150000, 26000000, 11000000, 1900000, 850000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Business', 4, 'active'),
('inc.com', 'contact@inc.com', 3400.00, 3100.00, 83, 82, 1080000, 23000000, 10500000, 1700000, 780000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Business', 6, 'active'),

-- Entertainment websites  
('variety.com', 'news@variety.com', 3800.00, 3500.00, 86, 85, 1250000, 27000000, 12500000, 2000000, 920000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Entertainment', 3, 'active'),
('hollywoodreporter.com', 'editorial@thr.com', 3600.00, 3300.00, 84, 83, 1180000, 25000000, 11800000, 1850000, 880000, true, false, false, false, false, false, true, true, true, false, false, false, false, 'Entertainment', 4, 'active')

ON CONFLICT (website) DO NOTHING;

-- Verify the data
SELECT 
  COUNT(*) as total_websites,
  COUNT(*) FILTER (WHERE status = 'active') as active_websites,
  AVG(domain_rating) as avg_dr,
  AVG(da) as avg_da,
  SUM(organic_traffic) as total_organic_traffic
FROM website_inventory;