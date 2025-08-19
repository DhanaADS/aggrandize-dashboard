-- Add missing profile image columns to user_profiles table
-- Run this in your Supabase SQL editor

-- Add the profile image columns if they don't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS profile_image_source text DEFAULT 'emoji' CHECK (profile_image_source IN ('gmail', 'upload', 'emoji')),
ADD COLUMN IF NOT EXISTS profile_image_thumbnail text,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Update existing users to have emoji as default image source if null
UPDATE user_profiles 
SET profile_image_source = 'emoji' 
WHERE profile_image_source IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('profile_image_url', 'profile_image_source', 'profile_image_thumbnail', 'last_login')
ORDER BY column_name;

-- Check current data
SELECT email, full_name, profile_icon, profile_image_source, profile_image_url 
FROM user_profiles 
ORDER BY email;