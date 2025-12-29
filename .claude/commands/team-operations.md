# Team Operations

Manage team members and their roles in AGGRANDIZE Dashboard.

## Instructions

### Operations Available
Ask user what they want to do:
- **List team** - Show all team members with roles
- **Member details** - View specific team member info
- **Update role** - Change a member's role/permissions

### Team Roster Format
```
AGGRANDIZE TEAM
===============
| Name     | Email                          | Role       | Status |
|----------|--------------------------------|------------|--------|
| Dhana    | dhana@aggrandizedigital.com    | Admin      | Active |
| Saravana | saravana@aggrandizedigital.com | Admin      | Active |
| Veera    | veera@aggrandizedigital.com    | Marketing  | Active |
| Saran    | saran@aggrandizedigital.com    | Marketing  | Active |
| Abbas    | abbas@aggrandizedigital.com    | Processing | Active |
| Gokul    | gokul@aggrandizedigital.com    | Processing | Active |
```

### Role Definitions
- **Admin**: Full access to all features, user management, system settings
- **Marketing**: Orders, clients, inventory, payment tracking
- **Processing**: Task management, content submission, publication tracking
- **Member**: Basic dashboard access

### Data Sources
- `user_profiles` table in Umbrel PostgreSQL
- Session user roles from NextAuth

### SQL Queries
```sql
-- List all team members
SELECT id, email, full_name, role, employee_no, designation
FROM user_profiles
ORDER BY role, full_name;

-- Get member details
SELECT * FROM user_profiles WHERE email = $1;

-- Update role (Admin only)
UPDATE user_profiles SET role = $1 WHERE email = $2;
```
