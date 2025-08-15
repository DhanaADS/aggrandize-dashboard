-- Create workflow_templates table if it doesn't exist
-- This is the main table for storing N8N-style workflow definitions

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL, -- References auth.users(id)
  is_public BOOLEAN DEFAULT false,
  
  -- New N8N-style workflow structure
  nodes JSONB DEFAULT '[]'::jsonb,
  connections JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Legacy fields for backward compatibility
  title_rules JSONB DEFAULT '[]'::jsonb,
  body_rules JSONB DEFAULT '[]'::jsonb,
  url_rules JSONB DEFAULT '[]'::jsonb,
  title_logic VARCHAR(10) DEFAULT 'OR',
  body_logic VARCHAR(10) DEFAULT 'OR',
  url_logic VARCHAR(10) DEFAULT 'OR',
  ai_config JSONB DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by ON workflow_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_workflow_templates_nodes ON workflow_templates USING GIN (nodes);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_connections ON workflow_templates USING GIN (connections);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_name ON workflow_templates(name);

-- Add RLS (Row Level Security) policies
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own templates and public templates
CREATE POLICY "Users can view own and public templates" ON workflow_templates
  FOR SELECT USING (
    created_by = auth.uid() OR is_public = true
  );

-- Policy: Users can insert their own templates
CREATE POLICY "Users can create templates" ON workflow_templates
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates" ON workflow_templates
  FOR UPDATE USING (
    created_by = auth.uid()
  ) WITH CHECK (
    created_by = auth.uid()
  );

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON workflow_templates
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_templates_updated_at 
    BEFORE UPDATE ON workflow_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE workflow_templates IS 'Stores N8N-style workflow templates with nodes and connections';
COMMENT ON COLUMN workflow_templates.nodes IS 'JSONB array of workflow nodes with positions and properties';
COMMENT ON COLUMN workflow_templates.connections IS 'JSONB array of connections between workflow nodes';
COMMENT ON COLUMN workflow_templates.variables IS 'JSONB object containing workflow variables and their values';
COMMENT ON COLUMN workflow_templates.settings IS 'JSONB object containing workflow execution settings (timeout, retries, etc)';

-- Insert a sample template for testing
INSERT INTO workflow_templates (
  name,
  description,
  created_by,
  is_public,
  nodes,
  connections,
  variables,
  settings
) VALUES (
  'Sample SEO Workflow',
  'A sample workflow for testing the N8N SEO automation system',
  (SELECT id FROM auth.users LIMIT 1), -- Use first user as creator
  true,
  '[
    {
      "id": "start-1",
      "type": "start",
      "nodeType": "start",
      "title": "Start",
      "position": {"x": 200, "y": 200},
      "properties": {},
      "status": "idle"
    },
    {
      "id": "http-1",
      "type": "source",
      "nodeType": "http-request",
      "title": "HTTP Request",
      "position": {"x": 400, "y": 200},
      "properties": {
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "method": "GET"
      },
      "status": "idle"
    }
  ]'::jsonb,
  '[
    {
      "id": "conn-1",
      "sourceNodeId": "start-1",
      "targetNodeId": "http-1",
      "sourcePort": "main",
      "targetPort": "input"
    }
  ]'::jsonb,
  '{}'::jsonb,
  '{
    "maxRetries": 3,
    "timeout": 300000,
    "parallelExecution": false,
    "errorStrategy": "stop"
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Show the created table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'workflow_templates' 
ORDER BY ordinal_position;