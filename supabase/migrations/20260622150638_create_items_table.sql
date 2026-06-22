CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  image_url text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  category text,
  condition text,
  ai_confidence text,
  platform text,
  status text NOT NULL DEFAULT 'not_listed',
  export_text text
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_items" ON items FOR SELECT TO anon USING (true);
CREATE POLICY "insert_items" ON items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_items" ON items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_items" ON items FOR DELETE TO anon USING (true);
