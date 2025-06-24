import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  console.log('👋 [updatePresence] Starting presence update');
  try {
    const { error } = await supabase.rpc('update_user_last_active');
    if (error) {
      console.error('❌ [updatePresence] Failed to update presence:', error);
      throw error;
    }
    console.log('✅ [updatePresence] Presence updated successfully');
  } catch (err) {
    console.error('💥 [updatePresence] Exception during presence update:', err);
  }
}
