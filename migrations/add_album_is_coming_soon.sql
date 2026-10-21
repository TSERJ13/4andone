-- Safe, additive migration
-- Adds is_coming_soon column to albums table
-- When true, the album displays a thin dark overlay with a SOON badge and is not clickable

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS is_coming_soon BOOLEAN DEFAULT false;
