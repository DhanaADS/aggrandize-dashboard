# Database Backup

Export data from databases for backup purposes.

## Backup Options

### 1. Full Backup (All Tables)
Export all data from Umbrel PostgreSQL:
- Finance tables (expenses, salaries, bills, subscriptions, settlements)
- Inventory (website_inventory)
- Team Hub (todos, comments, attachments)
- Orders (clients, orders, items, payments, invoices)

### 2. Selective Backup
Choose specific modules:
- [ ] Finance data only
- [ ] Inventory only
- [ ] Orders only
- [ ] Team Hub only

### 3. Date Range Backup
Export records within a specific date range.

## Export Formats

### JSON Export
```bash
# Export each table to JSON
pg_dump -t table_name --data-only -a -F p > backup.json
```

### CSV Export
```bash
# Export to CSV for spreadsheet compatibility
\copy table_name TO 'backup.csv' WITH CSV HEADER
```

### SQL Dump
```bash
# Full SQL dump for restoration
pg_dump aggrandize_business > backup.sql
```

## Backup Location
Save backups to:
- Local: `/backups/YYYY-MM-DD/`
- Google Drive (if configured)
- Umbrel storage

## Backup Report
```
BACKUP COMPLETE
===============
Date: 2025-12-16
Database: aggrandize_business

Tables Backed Up:
  - expenses: 145 records
  - salaries: 84 records
  - website_inventory: 18 records
  - orders: 52 records
  - clients: 23 records

Total Size: 2.4 MB
Location: /backups/2025-12-16/

Next Scheduled: 2025-12-23
```

## Automated Backups
Recommend setting up cron job for weekly backups:
```bash
0 2 * * 0 /path/to/backup-script.sh
```
