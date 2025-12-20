# Finance Summary

Generate a financial summary report for AGGRANDIZE Dashboard.

## Instructions

### Time Period
Ask user for time period:
- This month (default)
- Last month
- This quarter
- This year
- Custom date range

### Report Sections

#### 1. Revenue Summary
```
REVENUE SUMMARY
===============
Total Orders: $XX,XXX
Payments Received: $XX,XXX
Outstanding Balances: $XX,XXX
```

#### 2. Expense Summary
Query expenses table and summarize by category:
- Salary payments
- Utility bills (Internet, EB, Water)
- Subscriptions
- Other expenses

#### 3. Profit/Loss
```
PROFIT & LOSS
=============
Total Revenue: $XX,XXX
Total Expenses: $XX,XXX
Net Profit: $XX,XXX
```

#### 4. Payment Methods Breakdown
Show payments received by method:
- PayPal: $X,XXX (XX%)
- Wise: $X,XXX (XX%)
- Bank Transfer: $X,XXX (XX%)
- Other: $X,XXX (XX%)

#### 5. Upcoming Payments
List upcoming:
- Bills due this week
- Subscription renewals
- Salary payments due

### Data Sources
- `expenses` table
- `salaries` table
- `utility_bills` table
- `subscriptions` table
- `order_payments` table (for revenue)
