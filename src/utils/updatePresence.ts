import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  try {
    // Check session validity first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No valid session for presence update');
      return;
    }
    
    const { error } = await supabase.rpc('update_user_last_active');
    if (error) throw error;
  } catch (err) {
    // Try to reconnect and retry once
    try {
      await supabase.auth.refreshSession();
      await new Promise((r) => setTimeout(r, 300));
      const { error } = await supabase.rpc('update_user_last_active');
      if (error) throw error;
    } catch (retryErr) {
      console.warn('Failed to update presence after retry:', retryErr);
    }
  }
}
