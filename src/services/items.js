import { supabase, STORAGE_BUCKET } from '../lib/supabase.js'

export async function fetchItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createItem(item) {
  const { data, error } = await supabase
    .from('items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItem(id, updates) {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

export async function uploadImage(file) {
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, file, { upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename)
  return { publicUrl: urlData.publicUrl, path: data.path }
}
