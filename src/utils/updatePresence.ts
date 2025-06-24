import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  await supabase.rpc('update_user_last_active');
}
