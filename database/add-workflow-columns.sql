-- Add missing columns to workflow_templates table for N8N-style workflows
-- This extends the existing table structure to support the new workflow system

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add nodes column (JSONB array of workflow nodes)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_templates' AND column_name = 'nodes') THEN
    ALTER TABLE workflow_templates ADD COLUMN nodes JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add connections column (JSONB array of node connections)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_templates' AND column_name = 'connections') THEN
    ALTER TABLE workflow_templates ADD COLUMN connections JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add variables column (JSONB object for workflow variables)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_templates' AND column_name = 'variables') THEN
    ALTER TABLE workflow_templates ADD COLUMN variables JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add settings column (JSONB object for workflow settings)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_templates' AND column_name = 'settings') THEN
    ALTER TABLE workflow_templates ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_nodes ON workflow_templates USING GIN (nodes);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_connections ON workflow_templates USING GIN (connections);

-- Add comment to document the table structure
COMMENT ON COLUMN workflow_templates.nodes IS 'JSONB array of workflow nodes with positions and properties';
COMMENT ON COLUMN workflow_templates.connections IS 'JSONB array of connections between workflow nodes';
COMMENT ON COLUMN workflow_templates.variables IS 'JSONB object containing workflow variables and their values';
COMMENT ON COLUMN workflow_templates.settings IS 'JSONB object containing workflow execution settings (timeout, retries, etc)';

-- Show the updated table structure
\d workflow_templates;