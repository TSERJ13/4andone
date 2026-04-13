-- Add the missing artwork_url column to the tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artwork_url TEXT;

-- Recommended: Ensure other metadata columns are present
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS global_order INTEGER DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
