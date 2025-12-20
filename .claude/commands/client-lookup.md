# Client Lookup

Look up client details and order history in the AGGRANDIZE Dashboard.

## Instructions

### Search Client
Ask user for:
- Client name (partial match)
- Client email
- Company name

### Client Profile
Display client information:
```
CLIENT PROFILE
==============
Name: [Client Name]
Email: [email@example.com]
Company: [Company Name]
Phone: [+1 XXX-XXX-XXXX]
Telegram: [@username]
Status: Active/Inactive
Since: [First order date]
```

### Order History
```
ORDER HISTORY
=============
Total Orders: X
Total Spent: $XX,XXX
Outstanding: $X,XXX

Recent Orders:
| Order #      | Date       | Project    | Amount  | Status      |
|--------------|------------|------------|---------|-------------|
| AGG-2025-050 | 2025-12-15 | Campaign A | $5,000  | In Progress |
| AGG-2025-042 | 2025-11-20 | Campaign B | $3,500  | Completed   |
```

### Payment History
```
PAYMENT HISTORY
===============
| Date       | Order        | Amount  | Method | Reference |
|------------|--------------|---------|--------|-----------|
| 2025-12-10 | AGG-2025-050 | $2,500  | PayPal | INV-1234  |
| 2025-11-25 | AGG-2025-042 | $3,500  | Wise   | WIS-5678  |
```

### Actions
Offer to:
- View specific order details
- Create new order for this client
- Update client contact info
- Export client history
