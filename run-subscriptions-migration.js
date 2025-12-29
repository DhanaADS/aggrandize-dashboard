// Run subscriptions schema migration via Umbrel API
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // API Configuration from environment
  const apiUrl = process.env.UMBREL_API_URL || 'https://api.aggrandizedigital.com';
  const apiKey = process.env.UMBREL_API_KEY;
  const adminKey = process.env.UMBREL_ADMIN_KEY;

  if (!apiKey) {
    console.error('Error: UMBREL_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log(`Using API: ${apiUrl}`);

  // First, check current table structure
  console.log('\n1. Checking current subscriptions table structure...');

  try {
    const checkResponse = await fetch(`${apiUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-ADMIN-KEY': adminKey || '',
      },
      body: JSON.stringify({
        sql: `SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = 'subscriptions'
              ORDER BY ordinal_position`,
        params: [],
      }),
    });

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      console.log('Current columns:', data.rows?.map(r => r.column_name).join(', '));
    } else {
      console.log('Could not fetch column info:', await checkResponse.text());
    }
  } catch (e) {
    console.log('Error checking columns:', e.message);
  }

  // Migration queries - run them one by one
  const migrations = [
    {
      name: 'Add due_date column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS due_date date`
    },
    {
      name: 'Add next_due_date column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_due_date date`
    },
    {
      name: 'Add used_by column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS used_by text`
    },
    {
      name: 'Add paid_by column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paid_by text`
    },
    {
      name: 'Add auto_renewal column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renewal boolean DEFAULT true`
    },
    {
      name: 'Add is_active column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true`
    },
    {
      name: 'Add category column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS category text`
    },
    {
      name: 'Add notes column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes text`
    },
    {
      name: 'Add renewal_cycle column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_cycle text DEFAULT 'Monthly'`
    },
    {
      name: 'Add platform column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS platform text`
    },
    {
      name: 'Add plan_type column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_type text`
    },
    {
      name: 'Add purpose column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS purpose text`
    },
    {
      name: 'Add amount_inr column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_inr decimal(10,2)`
    },
    {
      name: 'Add amount_usd column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_usd decimal(10,2)`
    },
    {
      name: 'Add payment_method_id column',
      sql: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method_id text`
    },
  ];

  console.log('\n2. Running migrations...');

  for (const migration of migrations) {
    try {
      console.log(`  - ${migration.name}...`);

      const response = await fetch(`${apiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-ADMIN-KEY': adminKey || '',
        },
        body: JSON.stringify({
          sql: migration.sql,
          params: [],
        }),
      });

      if (response.ok) {
        console.log(`    ✓ Success`);
      } else {
        const errorText = await response.text();
        // "already exists" is not an error
        if (errorText.includes('already exists')) {
          console.log(`    ✓ Column already exists`);
        } else {
          console.log(`    ✗ Failed: ${errorText}`);
        }
      }
    } catch (error) {
      console.log(`    ✗ Error: ${error.message}`);
    }
  }

  // Verify the migration
  console.log('\n3. Verifying migration...');

  try {
    const verifyResponse = await fetch(`${apiUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-ADMIN-KEY': adminKey || '',
      },
      body: JSON.stringify({
        sql: `SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_name = 'subscriptions'
              ORDER BY ordinal_position`,
        params: [],
      }),
    });

    if (verifyResponse.ok) {
      const data = await verifyResponse.json();
      console.log('\nFinal columns:');
      data.rows?.forEach(r => {
        console.log(`  - ${r.column_name}: ${r.data_type}`);
      });
    }
  } catch (e) {
    console.log('Error verifying:', e.message);
  }

  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);
