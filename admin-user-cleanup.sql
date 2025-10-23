-- Admin utility to clean up stuck user profiles
-- This script fixes users who were deleted but still have active profiles

-- First, let's see what users might be in a bad state
SELECT 
    id,
    email,
    full_name,
    role,
    deleted_at,
    created_at,
    updated_at
FROM user_profiles 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- If you see users above that should be active, you can run this to restore them:
-- UPDATE user_profiles SET deleted_at = NULL WHERE email = 'user@example.com';

-- Also check for duplicate email entries:
SELECT 
    email,
    COUNT(*) as count,
    GROUP_CONCAT(id) as user_ids
FROM user_profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- For any duplicates found, you may need to manually clean them up