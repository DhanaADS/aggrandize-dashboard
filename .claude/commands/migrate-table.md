# Migrate Table

Guide through migrating a specific table from Supabase to Umbrel PostgreSQL.

## Migration Workflow

### Step 1: Select Table
Ask user which table to migrate:
- expenses
- salaries
- utility_bills
- subscriptions
- settlements
- expense_categories
- payment_methods
- website_inventory
- todos
- todo_comments
- todo_attachments

### Step 2: Pre-Migration Check
- Verify table exists in Supabase
- Count records to migrate
- Check for foreign key dependencies
- Verify Umbrel connection is available

```
PRE-MIGRATION CHECK
===================
Table: expenses
Records: 145
Dependencies: expense_categories, payment_methods
Umbrel Status: Connected
```

### Step 3: Create Table in Umbrel
Generate and run CREATE TABLE statement:
- Match column types from Supabase
- Include indexes
- Add triggers (updated_at, etc.)

### Step 4: Export from Supabase
```sql
-- Export data as INSERT statements or CSV
SELECT * FROM table_name;
```

### Step 5: Import to Umbrel
```sql
-- Import data to Umbrel PostgreSQL
INSERT INTO table_name (...) VALUES (...);
```

### Step 6: Verify Migration
- Compare record counts
- Spot-check sample records
- Verify foreign keys work

```
MIGRATION COMPLETE
==================
Table: expenses
Source Records: 145
Migrated Records: 145
Status: SUCCESS

Verification:
  [x] Record count matches
  [x] Sample data verified
  [x] Foreign keys intact
```

### Step 7: Update Application Code
Remind to update:
- API routes to use Umbrel
- API client functions
- Any direct Supabase queries

### Step 8: Cleanup (Optional)
After verifying everything works:
- Keep Supabase table as backup
- OR drop Supabase table to save space

## Rollback
If migration fails:
- Data remains in Supabase (not deleted)
- Drop Umbrel table
- Fix issues and retry
