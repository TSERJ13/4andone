-- Create the Fitness style for specialized training
-- This style remains hidden from the main library/search but is available for practice

INSERT INTO styles (title, color, program, "order")
VALUES ('Fitness', '#1db954', 'Fitness', 99)
ON CONFLICT (title) DO NOTHING;

-- If you have a tags table and want to ensure a 'Fitness' tag exists too
INSERT INTO tags (name, color)
VALUES ('Fitness', '#1db954')
ON CONFLICT (name) DO NOTHING;
