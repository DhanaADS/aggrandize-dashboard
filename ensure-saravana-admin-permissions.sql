-- Ensure Saravana has admin-level permissions
-- First, check if user exists and update, otherwise insert

DO $$
BEGIN
    -- Try to update existing record
    UPDATE user_profiles 
    SET individual_permissions = '{
        "canAccessOrder": true,
        "canAccessProcessing": true,
        "canAccessInventory": true,
        "canAccessTools": true,
        "canAccessPayments": true,
        "canAccessTodos": true
    }'::jsonb
    WHERE email = 'saravana@aggrandizedigital.com';
    
    -- If no row was updated, insert new record
    IF NOT FOUND THEN
        INSERT INTO user_profiles (id, email, individual_permissions)
        VALUES (
            gen_random_uuid(),
            'saravana@aggrandizedigital.com', 
            '{
                "canAccessOrder": true,
                "canAccessProcessing": true,
                "canAccessInventory": true,
                "canAccessTools": true,
                "canAccessPayments": true,
                "canAccessTodos": true
            }'::jsonb
        );
    END IF;
END $$;