const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('styles').insert([{ title: 'API_TEST', color: '#000000', program: 'Latin' }]).select();
  console.log("INSERT RESULT:", { data, error });
  
  if (data) {
     await supabase.from('styles').delete().eq('id', data[0].id);
  }
}
run();
