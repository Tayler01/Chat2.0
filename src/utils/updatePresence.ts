import { supabase } from '../lib/supabase';

export async function updatePresence(): Promise<void> {
  console.log('👋 [updatePresence] Starting presence update');
  
  // Check if we have a valid session first
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔐 [updatePresence] Auth check:', {
    hasSession: !!session,
    userId: session?.user?.id
  });
  
  if (!session) {
    console.warn('⚠️ [updatePresence] No session found, skipping presence update');
    return;
  }
  
  try {
    const startTime = Date.now();
    const { error } = await supabase.rpc('update_user_last_active');
    const endTime = Date.now();
    console.log('⏱️ [updatePresence] RPC call took:', endTime - startTime, 'ms');
    
    if (error) {
      console.error('❌ [updatePresence] Failed to update presence:', error);
      throw error;
    }
    console.log('✅ [updatePresence] Presence updated successfully');
  } catch (err) {
    console.error('💥 [updatePresence] Exception during presence update:', err);
  }
}
