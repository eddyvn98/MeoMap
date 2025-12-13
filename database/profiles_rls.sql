-- Enable RLS and add policies for profiles table
-- Allow users to create and manage their own profiles

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Policy 1: Anyone can view profiles (for public display)
CREATE POLICY "Users can view all profiles"
ON profiles
FOR SELECT
USING (true);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Users can delete their own profile (optional, usually not needed)
CREATE POLICY "Users can delete own profile"
ON profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

COMMENT ON TABLE profiles IS 'User profiles with RLS enabled - users can manage their own profile';
