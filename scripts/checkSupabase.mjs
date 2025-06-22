import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, anon);

async function checkConnection() {
  try {
    const { error } = await supabase.from('messages').select('id').limit(1);
    if (error) {
      console.error('Supabase query failed:', error.message);
      process.exit(1);
    }
    console.log('Supabase connection successful.');
  } catch (err) {
    console.error('Failed to connect to Supabase:', err.message);
    process.exit(1);
  }
}

checkConnection();
