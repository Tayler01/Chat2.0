import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  try {
    // Add a timeout to prevent hanging
    const rpcPromise = supabase.rpc('update_user_last_active');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Presence update timeout')), 5000)
    );
    
    const { error } = await Promise.race([rpcPromise, timeoutPromise]) as any;
    if (error) throw error;
  } catch (err) {
    console.error('Failed to update presence:', err);
  }
}
