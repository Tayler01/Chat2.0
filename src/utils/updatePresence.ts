import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_last_active');
    if (error) throw error;
  } catch (err) {
    // Try to reconnect and retry once
    try {
      await supabase.auth.refreshSession();
      supabase.realtime.connect();
      await new Promise((r) => setTimeout(r, 300));
      const { error } = await supabase.rpc('update_user_last_active');
      if (error) throw error;
    } catch (retryErr) {
      console.error('Failed to update presence after retry:', retryErr);
    }
  }
}
