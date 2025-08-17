# Apply Unread Messages Schema

To fix the unread messages persistence across page refreshes, you need to apply the database schema:

## Option 1: Basic Schema (Recommended)
Run this SQL in your Supabase SQL Editor:

```bash
# Copy and paste the contents of this file into Supabase SQL Editor:
cat unread-messages-basic-schema.sql
```

## Option 2: Full Enhanced Schema
If you want all enhanced features:

```bash
# Copy and paste the contents of this file into Supabase SQL Editor:
cat unread-messages-schema.sql
```

## What this fixes:
- ✅ Unread message counts persist across page refreshes
- ✅ Proper database permissions for both admin and user logins
- ✅ No more repetitive unread notifications
- ✅ Mark as read functionality works permanently

## After applying the schema:
1. Refresh your application
2. Test marking messages as read
3. Refresh the page - unread counts should persist correctly

The application will gracefully fall back to local state if the schema isn't applied yet.