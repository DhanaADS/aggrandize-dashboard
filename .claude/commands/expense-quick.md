# Quick Expense Entry

Quickly add and view expenses in AGGRANDIZE Dashboard.

## Instructions

### Quick Actions
Ask user what they want:
- **Add expense** - Quick entry form
- **Today's expenses** - List today's expenses
- **Pending approval** - Expenses awaiting approval
- **Monthly summary** - This month's expense summary

### Quick Add Form
Collect:
1. Amount (INR) - auto-converts to USD at 83.5 rate
2. Category - Salary, Internet, EB Bill, Subscription, Other
3. Paid by - Team member who paid
4. Purpose - Brief description
5. Payment method - Office Card, Sevan Card, Cash, Bank Transfer

### Output Format
```
EXPENSE ADDED
=============
Amount: Rs.X,XXX ($XX.XX)
Category: [Category]
Paid by: [Name]
Purpose: [Description]
Status: Pending Approval
```

### Categories
- Salary (salary)
- Internet (utilities)
- EB Bill (utilities)
- Water Bill (utilities)
- Subscriptions (business_services)
- Office Supplies (other)
- Travel (other)
- Miscellaneous (other)

### Payment Methods
- Office Card (office_card)
- Sevan Card (sevan_card)
- Cash (cash)
- Bank Transfer (bank_transfer)

### Data Sources
- `expenses` table
- `expense_categories` table
- `payment_methods` table

### SQL Queries
```sql
-- Add expense
INSERT INTO expenses (amount_inr, amount_usd, category_id, person_paid, purpose, payment_method_id, payment_status, expense_date)
VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_DATE);

-- Today's expenses
SELECT * FROM expenses WHERE expense_date = CURRENT_DATE;

-- Pending approval
SELECT * FROM expenses WHERE payment_status = 'pending';

-- Monthly summary
SELECT category_id, SUM(amount_inr) as total
FROM expenses
WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY category_id;
```
