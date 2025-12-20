# Order Status Report

Generate a status report for orders in the AGGRANDIZE Dashboard.

## Instructions

### Query Parameters
Ask the user what they want to see:
- **All orders**: Complete list
- **By status**: draft, confirmed, in_progress, completed, cancelled
- **By client**: Filter by specific client
- **By date range**: Orders within a date range
- **Overdue only**: Orders past their due date

### Report Sections

#### 1. Summary Statistics
```
ORDER SUMMARY
=============
Total Orders: XX
- Draft: X
- Confirmed: X
- In Progress: X
- Completed: X
- Cancelled: X

Total Revenue: $XX,XXX
Total Paid: $XX,XXX
Outstanding Balance: $XX,XXX
```

#### 2. Orders List
For each order show:
- Order Number
- Client Name
- Project Name
- Order Date / Due Date
- Total Amount / Paid / Balance
- Publication Count (completed/total)

#### 3. Overdue Alerts
Highlight orders that are:
- Past due date but not completed
- Have outstanding balance

### Output Format
Generate a clean, formatted report for terminal or team chat.
