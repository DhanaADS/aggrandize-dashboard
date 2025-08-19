-- Fix Gmail profile image data migration
-- Run this in your Supabase SQL editor

-- Move Gmail URLs from profile_icon to profile_image_url and update source
UPDATE user_profiles 
SET 
    profile_image_url = profile_icon,
    profile_image_thumbnail = profile_icon,
    profile_image_source = 'gmail',
    profile_icon = null
WHERE profile_icon LIKE 'https://lh3.googleusercontent.com%';

-- Verify the migration
SELECT 
    email, 
    full_name, 
    profile_image_source,
    CASE 
        WHEN profile_image_url IS NOT NULL THEN 'Has Gmail Image'
        WHEN profile_icon IS NOT NULL THEN 'Has Emoji'
        ELSE 'No Avatar'
    END as avatar_type,
    LEFT(profile_image_url, 50) as image_url_preview
FROM user_profiles 
ORDER BY email;

-- Count by avatar type
SELECT 
    profile_image_source,
    COUNT(*) as count
FROM user_profiles 
GROUP BY profile_image_source;