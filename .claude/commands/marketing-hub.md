# Marketing Hub

Central command for Marketing team operations (Orders, Clients, Inventory).

## Instructions

### Available Operations
- **Create order** - New client order with publications
- **Order status** - Check order progress and payments
- **Client report** - Client history and lifetime value
- **Inventory check** - Publication availability and pricing
- **Assign processing** - Assign orders to processing team
- **Payment follow-up** - Outstanding balance reminders

### Quick Stats Dashboard Format
```
MARKETING DASHBOARD
===================
Orders This Month: XX
- Draft: X
- Confirmed: X
- In Progress: X
- Completed: X
- Cancelled: X

Revenue: $XX,XXX
Payments Received: $XX,XXX
Outstanding: $X,XXX

Top Clients:
1. [Client A] - $X,XXX (X orders)
2. [Client B] - $X,XXX (X orders)
3. [Client C] - $X,XXX (X orders)

Pending Actions:
- X orders need follow-up
- X payments overdue
- X orders unassigned
```

### Order Workflow
```
draft -> confirmed -> in_progress -> completed
                  |
                  +-> cancelled
```

### Payment Workflow
```
unpaid -> partial -> paid
```

### Data Sources
- `orders` table
- `order_items` table
- `order_payments` table
- `clients` table (if exists)
- `website_inventory` table

### API Usage

#### Create Order
```
POST /api/order
{
  "client_name": "Client Name",
  "client_email": "email@example.com",
  "project_name": "Project X",
  "order_date": "2024-12-22",
  "due_date": "2024-12-30",
  "items": [
    { "publication_id": "uuid", "keyword": "SEO Services", "client_url": "https://..." }
  ]
}
```

#### Assign Order
```
PATCH /api/order/[orderId]
{
  "assigned_to": "abbas@aggrandizedigital.com"
}
```

### SQL Queries
```sql
-- Monthly order stats
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  SUM(total_amount) as revenue,
  SUM(amount_paid) as paid,
  SUM(balance_due) as outstanding
FROM orders
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE);

-- Top clients
SELECT client_name, SUM(total_amount) as total, COUNT(*) as order_count
FROM orders
GROUP BY client_name
ORDER BY total DESC
LIMIT 5;

-- Unassigned orders
SELECT * FROM orders WHERE assigned_to IS NULL AND status = 'confirmed';

-- Check inventory
SELECT * FROM website_inventory WHERE is_active = true ORDER BY price DESC;
```
