-- Role Management Schema Updates
-- Add role column to user_profiles table

-- First, add the role column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'marketing', 'processing', 'member'));

-- Update existing users with default roles (keep current admin intact)
-- Note: Admin users are already set via email-based role mapping in NextAuth

-- Create index for efficient role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Update RLS policies to include role-based access
DROP POLICY IF EXISTS "Users can view all profiles for team collaboration" ON user_profiles;
CREATE POLICY "Users can view all profiles for team collaboration" ON user_profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can update user roles" ON user_profiles;
CREATE POLICY "Only admins can update user roles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Create a function to get team members by role
CREATE OR REPLACE FUNCTION get_team_members_by_role(target_role TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF target_role IS NULL THEN
        RETURN QUERY
        SELECT 
            up.id,
            up.email,
            up.full_name,
            up.role,
            up.created_at
        FROM user_profiles up
        WHERE up.role IN ('marketing', 'processing', 'admin')
        ORDER BY up.role, up.full_name;
    ELSE
        RETURN QUERY
        SELECT 
            up.id,
            up.email,
            up.full_name,
            up.role,
            up.created_at
        FROM user_profiles up
        WHERE up.role = target_role
        ORDER BY up.full_name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_team_members_by_role(TEXT) TO authenticated;

-- Update todos table to reference role-based assignments (optional foreign key)
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS assigned_role TEXT CHECK (assigned_role IN ('marketing', 'processing', 'admin'));

-- Create index for role-based todo filtering
CREATE INDEX IF NOT EXISTS idx_todos_assigned_role ON todos(assigned_role);

-- Update the todos view function to include role information
CREATE OR REPLACE VIEW todos_with_assignee AS
SELECT 
    t.*,
    up.full_name as assigned_to_name,
    up.role as assigned_to_role
FROM todos t
LEFT JOIN user_profiles up ON t.assigned_to = up.email;

-- Grant access to the view
GRANT SELECT ON todos_with_assignee TO authenticated;

COMMENT ON COLUMN user_profiles.role IS 'User role: admin, marketing, processing, or member';
COMMENT ON COLUMN todos.assigned_role IS 'Optional role-based assignment for broader team assignment';
COMMENT ON FUNCTION get_team_members_by_role(TEXT) IS 'Returns team members filtered by role, or all team members if no role specified';