-- Fix the user profile creation trigger to work with new schema

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that works with the new schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    role,
    employee_no,
    monthly_salary_inr
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'member'),
    'EMP' || EXTRACT(EPOCH FROM NOW())::bigint::text,  -- Generate employee number
    0  -- Default salary
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the admin service role can insert/update user profiles
-- This is needed for server-side user creation
CREATE POLICY IF NOT EXISTS "Service role can manage profiles" ON user_profiles
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow the service role to bypass RLS for user creation
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;