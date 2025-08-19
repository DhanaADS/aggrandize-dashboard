const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSchemaUpdate() {
  console.log('🔄 Adding edit tracking columns to todos table...');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./add-edit-tracking.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.error('❌ SQL execution failed:', error);
      
      // Try individual commands if RPC fails
      console.log('🔄 Trying individual SQL commands...');
      
      // Add columns
      const { error: alterError } = await supabase
        .from('todos')
        .select('last_edited_at, last_edited_by')
        .limit(1);
        
      if (alterError && alterError.code === 'PGRST116') {
        console.log('✅ Columns need to be added');
        
        // Use raw SQL through edge function or direct connection
        console.log('📋 Please run this SQL manually in Supabase Dashboard:');
        console.log('');
        console.log(sql);
        console.log('');
        console.log('Navigate to: Supabase Dashboard → SQL Editor → New Query');
      } else {
        console.log('✅ Columns already exist or accessible');
      }
    } else {
      console.log('✅ Schema update completed successfully');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('📋 Please run this SQL manually in Supabase Dashboard:');
    console.log('');
    console.log(fs.readFileSync('./add-edit-tracking.sql', 'utf8'));
  }
}

runSchemaUpdate();