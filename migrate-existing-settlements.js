// Migration script to generate settlements for existing expenses and subscriptions
// Run this once to create settlements for existing data

import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateAutoSettlement(params) {
  // Don't create settlement if it's the same person
  if (params.from_person === params.to_person) {
    return null;
  }

  // Check if settlement already exists for this expense/subscription
  let existingQuery = supabase.from('settlements').select('id');
  
  if (params.related_expense_id) {
    existingQuery = existingQuery.eq('related_expense_id', params.related_expense_id);
  } else if (params.related_subscription_id) {
    existingQuery = existingQuery.eq('related_subscription_id', params.related_subscription_id);
  } else {
    return null;
  }

  const { data: existing } = await existingQuery;
  if (existing && existing.length > 0) {
    console.log(`Settlement already exists for ${params.related_expense_id || params.related_subscription_id}`);
    return null;
  }

  // Create auto-settlement
  const settlementData = {
    from_person: params.from_person,
    to_person: params.to_person,
    amount_inr: params.amount_inr,
    purpose: `Auto-settlement: ${params.purpose}`,
    settlement_status: 'pending',
    related_expense_id: params.related_expense_id,
    related_subscription_id: params.related_subscription_id,
    notes: 'Auto-generated from existing data'
  };

  const { data, error } = await supabase
    .from('settlements')
    .insert([settlementData])
    .select()
    .single();

  if (error) {
    console.error('Error creating settlement:', error);
    return null;
  }

  console.log(`Created settlement: ${params.from_person} owes ${params.to_person} ₹${params.amount_inr}`);
  return data;
}

async function migrateExpenseSettlements() {
  console.log('🔍 Checking existing expenses for settlements...');
  
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('payment_status', 'paid')
    .not('person_responsible', 'is', null);

  if (error) {
    console.error('Error fetching expenses:', error);
    return;
  }

  console.log(`Found ${expenses.length} paid expenses`);

  let createdCount = 0;
  for (const expense of expenses) {
    if (expense.person_paid && expense.person_responsible && 
        expense.person_paid !== expense.person_responsible) {
      
      const settlement = await generateAutoSettlement({
        from_person: expense.person_responsible, // Person who should pay back
        to_person: expense.person_paid, // Person who actually paid
        amount_inr: expense.amount_inr,
        purpose: expense.purpose,
        related_expense_id: expense.id
      });

      if (settlement) {
        createdCount++;
      }
    }
  }

  console.log(`✅ Created ${createdCount} settlements from expenses`);
}

async function migrateSubscriptionSettlements() {
  console.log('🔍 Checking existing subscriptions for settlements...');
  
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return;
  }

  console.log(`Found ${subscriptions.length} active subscriptions`);

  let createdCount = 0;
  for (const subscription of subscriptions) {
    if (subscription.paid_by && subscription.used_by && 
        subscription.paid_by !== subscription.used_by) {
      
      const settlement = await generateAutoSettlement({
        from_person: subscription.used_by, // Person who should pay back
        to_person: subscription.paid_by, // Person who actually paid
        amount_inr: subscription.amount_inr,
        purpose: `${subscription.platform} - ${subscription.plan_type}`,
        related_subscription_id: subscription.id
      });

      if (settlement) {
        createdCount++;
      }
    }
  }

  console.log(`✅ Created ${createdCount} settlements from subscriptions`);
}

async function main() {
  console.log('🚀 Starting settlement migration...');
  
  try {
    // First apply the schema updates if not already done
    console.log('📝 Applying schema updates...');
    
    await supabase.rpc('exec', {
      sql: `
        -- Add missing fields to subscriptions table (if not already added)
        ALTER TABLE subscriptions 
        ADD COLUMN IF NOT EXISTS used_by text,
        ADD COLUMN IF NOT EXISTS paid_by text;

        -- Add related_subscription_id field to settlements table (if not already added)
        ALTER TABLE settlements 
        ADD COLUMN IF NOT EXISTS related_subscription_id uuid REFERENCES subscriptions(id);

        -- Add indexes (if not already added)
        CREATE INDEX IF NOT EXISTS idx_settlements_related_subscription_id ON settlements(related_subscription_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_used_by ON subscriptions(used_by);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_paid_by ON subscriptions(paid_by);
      `
    });
    
    console.log('✅ Schema updates applied');
    
    // Generate settlements for existing data
    await migrateExpenseSettlements();
    await migrateSubscriptionSettlements();
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
main();