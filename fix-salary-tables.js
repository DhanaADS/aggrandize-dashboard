// Fix Salary Tab - Create missing database tables via Umbrel API
async function fixSalaryTables() {
  const apiUrl = process.env.UMBREL_API_URL || 'https://api.aggrandizedigital.com';
  const apiKey = process.env.UMBREL_API_KEY;
  const adminKey = process.env.UMBREL_ADMIN_KEY;

  if (!apiKey) {
    console.error('Error: UMBREL_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log(`Using API: ${apiUrl}\n`);

  async function runQuery(name, sql) {
    console.log(`Running: ${name}...`);
    try {
      const response = await fetch(`${apiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-ADMIN-KEY': adminKey || '',
        },
        body: JSON.stringify({ sql, params: [] }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✓ Success`);
        return data;
      } else {
        const errorText = await response.text();
        if (errorText.includes('already exists')) {
          console.log(`  ✓ Already exists`);
          return null;
        }
        console.log(`  ✗ Failed: ${errorText}`);
        return null;
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      return null;
    }
  }

  // Step 1: Create user_profiles table
  console.log('=== Step 1: Create user_profiles table ===');
  await runQuery('Create user_profiles table', `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      full_name text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      employee_no text UNIQUE,
      monthly_salary_inr decimal(12,2) DEFAULT 0,
      designation text,
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW()
    )
  `);

  await runQuery('Create email index', `
    CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email)
  `);

  await runQuery('Create employee_no index', `
    CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_no ON user_profiles(employee_no)
  `);

  // Step 2: Insert employee data
  console.log('\n=== Step 2: Insert employee data ===');
  const employees = [
    { email: 'dhana@aggrandizedigital.com', full_name: 'Dhanapal Elango', role: 'admin', employee_no: 'ADS001', monthly_salary_inr: 300000, designation: 'CEO & Founder' },
    { email: 'veera@aggrandizedigital.com', full_name: 'Veerakeswaran', role: 'marketing', employee_no: 'ADS002', monthly_salary_inr: 50000, designation: 'Marketing Lead' },
    { email: 'saravana@aggrandizedigital.com', full_name: 'Saravanakumar', role: 'admin', employee_no: 'ADS003', monthly_salary_inr: 50000, designation: 'Operations Manager' },
    { email: 'gokul@aggrandizedigital.com', full_name: 'Gokul', role: 'processing', employee_no: 'ADS004', monthly_salary_inr: 33000, designation: 'Processing Specialist' },
    { email: 'abbas@aggrandizedigital.com', full_name: 'Abbas', role: 'processing', employee_no: 'ADS005', monthly_salary_inr: 34500, designation: 'Processing Specialist' },
    { email: 'laura@aggrandizedigital.com', full_name: 'Laura Keen', role: 'marketing', employee_no: 'ADS006', monthly_salary_inr: 27500, designation: 'Marketing Associate' },
  ];

  for (const emp of employees) {
    await runQuery(`Insert ${emp.full_name}`, `
      INSERT INTO user_profiles (email, full_name, role, employee_no, monthly_salary_inr, designation)
      VALUES ('${emp.email}', '${emp.full_name}', '${emp.role}', '${emp.employee_no}', ${emp.monthly_salary_inr}, '${emp.designation}')
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        employee_no = EXCLUDED.employee_no,
        monthly_salary_inr = EXCLUDED.monthly_salary_inr,
        designation = EXCLUDED.designation
    `);
  }

  // Step 3: Create monthly_salary_payments table
  console.log('\n=== Step 3: Create monthly_salary_payments table ===');
  await runQuery('Create monthly_salary_payments table', `
    CREATE TABLE IF NOT EXISTS monthly_salary_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      payment_month text NOT NULL,
      payment_status text NOT NULL DEFAULT 'not_paid',
      payment_date timestamp with time zone,
      notes text,
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW(),
      UNIQUE(employee_id, payment_month)
    )
  `);

  await runQuery('Create payment_month index', `
    CREATE INDEX IF NOT EXISTS idx_monthly_salary_payments_month ON monthly_salary_payments(payment_month)
  `);

  await runQuery('Create employee_id index', `
    CREATE INDEX IF NOT EXISTS idx_monthly_salary_payments_employee ON monthly_salary_payments(employee_id)
  `);

  // Step 4: Verify the tables
  console.log('\n=== Step 4: Verify tables ===');
  const verifyUsers = await runQuery('Verify user_profiles', `
    SELECT id, full_name, employee_no, monthly_salary_inr FROM user_profiles ORDER BY employee_no
  `);
  if (verifyUsers?.rows) {
    console.log('\nEmployees in database:');
    verifyUsers.rows.forEach(r => {
      console.log(`  ${r.employee_no}: ${r.full_name} - ₹${Number(r.monthly_salary_inr).toLocaleString('en-IN')}`);
    });
  }

  console.log('\n✅ Salary tables setup complete!');
}

fixSalaryTables().catch(console.error);
