import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_last_active');
    if (error) throw error;
  } catch (err) {
    // Silently fail presence updates to avoid interfering with main functionality
    console.warn('Failed to update presence:', err);
  }
}
