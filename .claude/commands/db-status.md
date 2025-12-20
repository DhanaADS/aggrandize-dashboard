# Database Status Check

Check the connection status for all databases used by the AGGRANDIZE Dashboard.

## Instructions

1. **Check Supabase Connection**
   - Read the `.env.local` file to get Supabase credentials
   - Test connection to Supabase using the credentials
   - Report: Connected/Disconnected, any errors

2. **Check Umbrel PostgreSQL Connection** (if configured)
   - Read `UMBREL_DATABASE_URL` from `.env.local`
   - Test connection to Umbrel PostgreSQL
   - Report: Connected/Disconnected, any errors

3. **Report Table Counts**
   For each connected database, report the number of records in key tables:

   **Supabase:**
   - user_profiles

   **Umbrel (if connected):**
   - expenses
   - salaries
   - website_inventory
   - todos
   - orders (if exists)
   - clients (if exists)

4. **Output Format**
   Provide a clean summary table showing:
   - Database name
   - Connection status
   - Key table counts
   - Any warnings or issues

## Example Output
```
DATABASE STATUS REPORT
======================

Supabase Cloud:
  Status: Connected
  Tables:
    - user_profiles: 7 records

Umbrel PostgreSQL:
  Status: Connected
  Tables:
    - expenses: 45 records
    - website_inventory: 18 records
    - orders: 12 records
```
