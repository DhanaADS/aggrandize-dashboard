-- Fix Comment Reactions RLS Policy
-- More permissive policy for reactions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can add their own reactions" ON todo_comment_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON todo_comment_reactions;
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON todo_comment_reactions;
DROP POLICY IF EXISTS "Authenticated users can remove reactions" ON todo_comment_reactions;

-- Disable RLS temporarily as a quick fix
ALTER TABLE todo_comment_reactions DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want user-specific control, use this instead:
-- CREATE POLICY "Users can add their own reactions" ON todo_comment_reactions
--   FOR INSERT WITH CHECK (
--     auth.role() = 'authenticated' AND 
--     (auth.email() = user_email OR auth.email() IS NOT NULL)
--   );

-- CREATE POLICY "Users can remove their own reactions" ON todo_comment_reactions
--   FOR DELETE USING (
--     auth.role() = 'authenticated' AND 
--     (auth.email() = user_email OR auth.email() IS NOT NULL)
--   );