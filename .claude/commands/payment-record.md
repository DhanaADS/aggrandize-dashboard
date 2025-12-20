# Record Payment

Guide through recording a new payment for an order.

## Workflow

### Step 1: Identify Order
Ask user for:
- Order number (e.g., AGG-2025-050)
- OR Client name to find their orders

Show order summary:
```
ORDER: AGG-2025-050
Client: [Client Name]
Project: [Project Name]
Total: $5,000
Paid: $2,500
Balance: $2,500
```

### Step 2: Payment Details
Collect payment information:
- **Amount**: Payment amount in USD
- **Payment Method**:
  - PayPal
  - Wise
  - Bank Transfer
  - Crypto
  - Cash
  - Other
- **Payment Type**:
  - Upfront (before work starts)
  - Partial (during work)
  - Completion (final payment)
  - Refund (money returned)
- **Payment Date**: Default to today
- **Reference Number**: Invoice/transaction ID (optional)
- **Notes**: Any additional notes

### Step 3: Link Invoice (Optional)
Ask if payment should be linked to an invoice:
- Existing invoice number
- Create new invoice
- External invoice URL (PayPal/Wise link)

### Step 4: Confirm & Record
Show summary before recording:
```
PAYMENT SUMMARY
===============
Order: AGG-2025-050
Amount: $2,500
Method: PayPal
Type: Completion
Date: 2025-12-16
Reference: INV-2025-0089

After this payment:
  Total Paid: $5,000
  Balance: $0.00 (FULLY PAID)
```

### Step 5: Update Order Status
If balance is $0, ask if order should be marked as completed.

## Notes
- Refunds are recorded as negative adjustments
- Currency conversion: 1 USD = 83.5 INR
