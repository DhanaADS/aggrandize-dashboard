-- Add deleted_at field to user_profiles table for soft deletion tracking
-- This allows us to distinguish between recently deleted users and actual duplicates

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
        
        -- Add index for better performance
        CREATE INDEX idx_user_profiles_deleted_at ON user_profiles(deleted_at);
        
        RAISE NOTICE 'Added deleted_at column to user_profiles table';
    ELSE
        RAISE NOTICE 'deleted_at column already exists in user_profiles table';
    END IF;
END $$;

-- Update existing profiles that might have been hard deleted to have consistent state
-- This is for cleanup purposes
UPDATE user_profiles 
SET deleted_at = NULL 
WHERE deleted_at IS NOT NULL AND email IN (
    SELECT DISTINCT email FROM user_profiles WHERE deleted_at IS NULL
);

-- Note: The actual deletion logic is handled in the application code
-- This migration provides the database structure needed for the feature

RAISE NOTICE 'Soft deletion migration completed successfully';