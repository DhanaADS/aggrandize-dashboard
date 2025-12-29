# Accounting Hub

Central command for Accounting team operations (Payments, Expenses, Salary).

## Instructions

### Available Operations
- **Daily expenses** - Add/view today's expenses
- **Salary status** - Monthly salary payment tracking
- **Bill reminders** - Upcoming utility bills and subscriptions
- **Settlements** - Team payment balances
- **Revenue report** - Client payments received
- **Expense approval** - Approve/reject pending expenses

### Financial Dashboard Format
```
ACCOUNTING DASHBOARD
====================
Period: [Month Year]

INCOME
------
Payments Received: $XX,XXX
Outstanding Invoices: $X,XXX
Collection Rate: XX%

EXPENSES
--------
Salaries: Rs.X,XX,XXX
Utilities: Rs.XX,XXX
  - Internet: Rs.X,XXX
  - Electricity: Rs.X,XXX
  - Water: Rs.X,XXX
Subscriptions: Rs.XX,XXX
Other Expenses: Rs.XX,XXX
----------------------------
Total Expenses: Rs.X,XX,XXX

PENDING ACTIONS
---------------
- X expenses awaiting approval
- X bills due this week
- X salary payments pending
- X settlements to process

PROFIT/LOSS
-----------
Revenue: $XX,XXX
Expenses: $XX,XXX (converted)
Net Profit: $X,XXX
```

### Currency Conversion
- Exchange Rate: 1 USD = Rs.83.5
- Always store amounts in both INR and USD

### Data Sources
- `expenses` table
- `salaries` table
- `utility_bills` table
- `subscriptions` table
- `settlements` table
- `order_payments` table

### API Endpoints
- `/api/salary-payments` - Salary tracking
- `/api/finance/expenses` - Expense management
- `/api/finance/subscriptions` - Subscription tracking

### SQL Queries
```sql
-- Monthly expense summary by category
SELECT
  c.name as category,
  SUM(e.amount_inr) as total_inr,
  SUM(e.amount_usd) as total_usd
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
WHERE e.expense_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY c.name
ORDER BY total_inr DESC;

-- Pending expenses
SELECT * FROM expenses
WHERE payment_status = 'pending'
ORDER BY expense_date DESC;

-- Upcoming bills (next 7 days)
SELECT * FROM utility_bills
WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND payment_status != 'paid';

-- Subscription renewals this month
SELECT * FROM subscriptions
WHERE next_due_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND next_due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  AND is_active = true;

-- Revenue received this month
SELECT SUM(amount) as total_received
FROM order_payments
WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE);

-- Settlement balances
SELECT * FROM settlements
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Expense Approval
```sql
-- Approve expense
UPDATE expenses SET payment_status = 'approved', approved_by = $1 WHERE id = $2;

-- Reject expense
UPDATE expenses SET payment_status = 'rejected', approved_by = $1, notes = $2 WHERE id = $3;
```
