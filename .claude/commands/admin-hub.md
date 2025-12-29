# Admin Hub

Central command for Admin operations (User management, API, System).

## Instructions

### Available Operations
- **User management** - Add/remove users, change roles
- **Permissions** - Update user permissions
- **System status** - Database connections, API health
- **Audit logs** - Recent system activity
- **API debug** - Test API endpoints
- **Deploy** - Build and deploy to Vercel

### Admin Dashboard Format
```
ADMIN DASHBOARD
===============
System Status: [OK] All Systems Operational

DATABASE
--------
- Supabase: [OK] Connected
- Umbrel: [OK] Connected
- Last Backup: DD/MM/YYYY HH:MM

USERS
-----
- Total Users: X
- Active Today: X
- Admins: X
- Marketing: X
- Processing: X

RECENT ACTIVITY
---------------
- [User] created order #XXX (2 min ago)
- [User] updated inventory (15 min ago)
- [User] processed payment (1 hour ago)
- [User] logged in (2 hours ago)

API HEALTH
----------
- /api/order: [OK] 45ms
- /api/processing: [OK] 32ms
- /api/salary-payments: [OK] 28ms
- /api/inventory: [OK] 51ms

ALERTS
------
- X failed login attempts today
- X API errors in last 24h
- Storage: XX% used
```

### User Roles & Permissions
```
Admin:
- All permissions
- User management
- System settings
- Deploy access

Marketing:
- can_access_orders: true
- can_access_inventory: true
- can_access_payments: true (view only)

Processing:
- can_access_processing: true
- can_access_orders: false (assigned only)

Member:
- Dashboard access only
```

### Data Sources
- `user_profiles` table
- NextAuth session
- All API routes in `/src/app/api/`

### Admin SQL Queries

#### User Management
```sql
-- List all users
SELECT id, email, full_name, role, employee_no, designation, created_at
FROM user_profiles
ORDER BY role, full_name;

-- Add user
INSERT INTO user_profiles (email, full_name, role, employee_no)
VALUES ($1, $2, $3, $4);

-- Update role
UPDATE user_profiles SET role = $1 WHERE email = $2;

-- Update permissions (JSONB)
UPDATE user_profiles
SET individual_permissions = $1
WHERE email = $2;

-- Deactivate user
UPDATE user_profiles SET is_active = false WHERE email = $1;
```

#### System Queries
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table row counts
SELECT
  'orders' as table_name, COUNT(*) as rows FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles;

-- Recent activity (if audit table exists)
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

### API Testing
```bash
# Health check
curl https://aggrandize-dashboard.vercel.app/api/health

# Test order API
curl https://aggrandize-dashboard.vercel.app/api/order

# Test processing API
curl https://aggrandize-dashboard.vercel.app/api/processing

# Test salary API
curl https://aggrandize-dashboard.vercel.app/api/salary-payments?month=2024-12
```

### Deployment
```bash
# Build locally
npm run build

# Deploy to Vercel
npx vercel --prod --yes

# Check deployment status
npx vercel ls
```

### Database Operations
```bash
# Check Umbrel connection
/db-status

# Backup database
/backup-db

# Migrate tables
/migrate-table
```

### Emergency Procedures
1. **API Down**: Check Vercel logs, redeploy if needed
2. **Database Issues**: Check Umbrel/Supabase dashboards
3. **Auth Problems**: Verify NextAuth config, check Google OAuth settings
4. **Permission Issues**: Check user_profiles.individual_permissions
