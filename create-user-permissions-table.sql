-- Create user_permissions table for storing individual permission overrides
CREATE TABLE user_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  can_access_order boolean DEFAULT false,
  can_access_processing boolean DEFAULT false,
  can_access_inventory boolean DEFAULT false,
  can_access_tools boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id),
  UNIQUE(user_email)
);

-- Enable RLS on user_permissions
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_permissions
-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions" ON user_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert/update/delete permissions
CREATE POLICY "Admins can manage permissions" ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_permissions_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ language plpgsql;

-- Trigger to update updated_at on permissions changes
CREATE TRIGGER on_user_permissions_updated
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_permissions_updated_at();

-- Function to initialize user permissions based on role when a user is created
CREATE OR REPLACE FUNCTION public.initialize_user_permissions()
RETURNS trigger AS $$
DECLARE
  default_order boolean := false;
  default_processing boolean := false;
  default_inventory boolean := false;
  default_tools boolean := false;
BEGIN
  -- Set default permissions based on role
  CASE NEW.role
    WHEN 'admin' THEN
      default_order := true;
      default_processing := true;
      default_inventory := true;
      default_tools := true;
    WHEN 'marketing' THEN
      default_order := true;
      default_processing := false;
      default_inventory := true;
      default_tools := true;
    WHEN 'processing' THEN
      default_order := false;
      default_processing := true;
      default_inventory := false;
      default_tools := true;
    ELSE
      -- Default case
      default_order := false;
      default_processing := false;
      default_inventory := false;
      default_tools := false;
  END CASE;

  -- Insert permissions for the new user
  INSERT INTO public.user_permissions (
    user_id, 
    user_email, 
    can_access_order, 
    can_access_processing, 
    can_access_inventory, 
    can_access_tools
  ) VALUES (
    NEW.id,
    NEW.email,
    default_order,
    default_processing,
    default_inventory,
    default_tools
  ) ON CONFLICT (user_id) DO UPDATE SET
    user_email = EXCLUDED.user_email,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Trigger to initialize permissions when a user profile is created
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.initialize_user_permissions();

-- Also trigger on updates to sync email changes
CREATE TRIGGER on_user_profile_updated_permissions
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.initialize_user_permissions();