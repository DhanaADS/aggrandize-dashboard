-- Make saravana@aggrandizedigital.com an admin user
-- Run this in your Supabase SQL editor

-- Update Saravana's role to admin
UPDATE user_profiles 
SET 
    role = 'admin',
    updated_at = NOW()
WHERE email = 'saravana@aggrandizedigital.com';

-- Clear individual permissions for admin (admins use role-based permissions)
UPDATE user_profiles 
SET 
    individual_permissions = NULL,
    updated_at = NOW()
WHERE email = 'saravana@aggrandizedigital.com';

-- Verify the update
SELECT email, full_name, role, individual_permissions 
FROM user_profiles 
WHERE email IN ('dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com')
ORDER BY email;