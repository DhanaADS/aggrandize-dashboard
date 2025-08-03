-- Create user_profiles table
create table user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'marketing', 'processing')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on user_profiles
alter table user_profiles enable row level security;

-- Create policies for user_profiles
create policy "Users can view own profile" on user_profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles" on user_profiles
  for select using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'processing')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on profile changes
create trigger on_user_profile_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

-- Insert the predefined users (you'll need to run this after creating the accounts)
-- Note: These will be created through the Supabase Auth interface first
/*
Expected users to create in Supabase Auth:
1. dhana@aggrandizedigital.com (admin)
2. veera@aggrandizedigital.com (marketing)
3. saravana@aggrandizedigital.com (marketing)
4. saran@aggrandizedigital.com (marketing)
5. abbas@aggrandizedigital.com (processing)
6. gokul@aggrandizedigital.com (processing)

After creating users in auth, their profiles will be auto-created with the trigger.
You can then update roles as needed.
*/