import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_last_active');
    if (error) throw error;
  } catch (err) {
    console.error('Failed to update presence:', err);
  }
}
