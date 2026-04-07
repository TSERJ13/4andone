-- Update final_folders to support user-specific data
ALTER TABLE public.final_folders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
DROP POLICY IF EXISTS "Enable insert for all users" ON public.final_folders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.final_folders;
DROP POLICY IF EXISTS "Enable update for all users" ON public.final_folders;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.final_folders;

CREATE POLICY "Users can see their own final folders" ON public.final_folders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert their own final folders" ON public.final_folders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update their own final folders" ON public.final_folders FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can delete their own final folders" ON public.final_folders FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Update final_folder_tracks to support user-specific data (via cascade or explicit column)
-- Adding explicit user_id for easier RLS management if needed, though folder relationship might suffice.
-- Let's stick to folder relationship for tracks, but add user_id to final_tracks table.

ALTER TABLE public.final_tracks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
DROP POLICY IF EXISTS "Enable access to all" ON public.final_tracks; -- Assuming there was one

CREATE POLICY "Users can manage their own final queue" ON public.final_tracks
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Ensure RLS is active
ALTER TABLE public.final_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_tracks ENABLE ROW LEVEL SECURITY;
