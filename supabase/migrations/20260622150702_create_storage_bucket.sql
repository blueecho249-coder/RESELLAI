INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_item_images" ON storage.objects FOR SELECT
  TO anon USING (bucket_id = 'item-images');
CREATE POLICY "public_insert_item_images" ON storage.objects FOR INSERT
  TO anon WITH CHECK (bucket_id = 'item-images');
CREATE POLICY "public_update_item_images" ON storage.objects FOR UPDATE
  TO anon USING (bucket_id = 'item-images');
CREATE POLICY "public_delete_item_images" ON storage.objects FOR DELETE
  TO anon USING (bucket_id = 'item-images');
