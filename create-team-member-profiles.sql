-- Create profiles for team members who haven't logged in yet
-- Run this in Supabase SQL Editor to pre-create profiles

-- Abbas Manthri - Processing Team
INSERT INTO user_profiles (
    id,
    email, 
    full_name, 
    role, 
    individual_permissions,
    profile_image_source,
    profile_icon,
    profile_image_url,
    profile_image_thumbnail,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'abbas@aggrandizedigital.com',
    'Abbas Manthri',
    'processing',
    '{"canAccessOrder": false, "canAccessProcessing": true, "canAccessInventory": false, "canAccessTools": true, "canAccessPayments": false, "canAccessTodos": true}'::jsonb,
    'emoji',
    'smiley',
    NULL,
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    individual_permissions = EXCLUDED.individual_permissions,
    updated_at = NOW();

-- Gokul Krishnan - Processing Team  
INSERT INTO user_profiles (
    id,
    email, 
    full_name, 
    role, 
    individual_permissions,
    profile_image_source,
    profile_icon,
    profile_image_url,
    profile_image_thumbnail,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'gokul@aggrandizedigital.com',
    'Gokul Krishnan',
    'processing',
    '{"canAccessOrder": false, "canAccessProcessing": true, "canAccessInventory": false, "canAccessTools": true, "canAccessPayments": false, "canAccessTodos": true}'::jsonb,
    'emoji',
    'smiley',
    NULL,
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    individual_permissions = EXCLUDED.individual_permissions,
    updated_at = NOW();

-- Verify the profiles were created
SELECT email, full_name, role, individual_permissions 
FROM user_profiles 
WHERE email IN ('abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com');