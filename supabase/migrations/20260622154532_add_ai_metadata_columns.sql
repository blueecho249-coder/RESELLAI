ALTER TABLE items
  ADD COLUMN IF NOT EXISTS notes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS confidence_level text,
  ADD COLUMN IF NOT EXISTS price_range_low numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_range_high numeric(10,2),
  ADD COLUMN IF NOT EXISTS requires_review boolean DEFAULT false;
