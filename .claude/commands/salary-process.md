# Salary Processing

Process and track team salary payments.

## Instructions

### Operations
Ask user what they want:
- **View status** - Show payment status for current month
- **Mark paid** - Record salary payment for employee
- **Bulk process** - Process all salaries for the month
- **Generate report** - Monthly salary report

### Salary Status Report Format
```
SALARY STATUS - [Month Year]
============================
| Employee | Salary (INR)  | Status  | Paid Date  |
|----------|---------------|---------|------------|
| Dhana    | Rs.XX,XXX     | Paid    | DD/MM/YYYY |
| Veera    | Rs.XX,XXX     | Pending | -          |
| Saravana | Rs.XX,XXX     | Paid    | DD/MM/YYYY |
| Saran    | Rs.XX,XXX     | Pending | -          |
| Abbas    | Rs.XX,XXX     | Paid    | DD/MM/YYYY |
| Gokul    | Rs.XX,XXX     | Pending | -          |

SUMMARY
-------
Total Employees: X
Total Paid: X (Rs.X,XX,XXX)
Total Pending: X (Rs.X,XX,XXX)
```

### Data Sources
- `user_profiles` table (employee info, monthly_salary_inr)
- `monthly_salary_payments` table (payment records)
- API: `/api/salary-payments`

### API Usage

#### GET - Fetch salary status
```
GET /api/salary-payments?month=2024-12
```

#### POST - Update payment status
```
POST /api/salary-payments
{
  "employee_id": "uuid",
  "payment_month": "2024-12",
  "payment_status": "paid",
  "notes": "Bank transfer completed"
}
```

### SQL Queries
```sql
-- Get all employees with salary info
SELECT id, email, full_name, employee_no, monthly_salary_inr, designation
FROM user_profiles
ORDER BY employee_no;

-- Get payment status for month
SELECT employee_id, payment_status, payment_date, notes
FROM monthly_salary_payments
WHERE payment_month = $1;

-- Mark salary as paid
INSERT INTO monthly_salary_payments (employee_id, payment_month, payment_status, payment_date, notes)
VALUES ($1, $2, 'paid', NOW(), $3)
ON CONFLICT (employee_id, payment_month)
DO UPDATE SET payment_status = 'paid', payment_date = NOW(), notes = $3;
```
