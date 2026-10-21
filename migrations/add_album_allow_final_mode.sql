-- Safe, additive migration
-- Adds allow_final_mode column to albums table
-- When false, tracks from this album will not play in Final Mode sessions

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS allow_final_mode BOOLEAN DEFAULT true;
