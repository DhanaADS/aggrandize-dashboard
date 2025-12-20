# Processing & Accounts Workflow System

## Overview

The Processing & Accounts Workflow System provides a complete order fulfillment pipeline from order creation to payment completion. It connects three teams:

- **Marketing/Order Team** - Creates orders, assigns items to processing, approves content
- **Processing Team** - Writes content, publishes articles, requests payment
- **Accounts Team** - Reviews payment requests, processes payments

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORDER WORKFLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   MARKETING  │    │  PROCESSING  │    │   ACCOUNTS   │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│    1. Create Order          │                   │                           │
│         │                   │                   │                           │
│    2. Assign Items ────────>│                   │                           │
│         │                   │                   │                           │
│         │              3. Work on Task          │                           │
│         │                   │                   │                           │
│         │              4. Submit for            │                           │
│         │<──────────────── Approval             │                           │
│         │                   │                   │                           │
│    5. Review & Approve ────>│                   │                           │
│         │                   │                   │                           │
│         │              6. Publish Article       │                           │
│         │                   │                   │                           │
│         │              7. Submit Live URL       │                           │
│         │                   │                   │                           │
│         │              8. Request Payment ─────>│                           │
│         │                   │                   │                           │
│         │                   │              9. Review Request                │
│         │                   │                   │                           │
│         │                   │             10. Process Payment               │
│         │                   │                   │                           │
│         │                   │<───────────11. Payment Complete               │
│         │                   │                   │                           │
│   12. Order Complete <──────│                   │                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### 1. `orders`
Main order table containing client information and pricing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_number | text | Unique order number (e.g., ORD-2024-001) |
| client_name | text | Client's name |
| client_email | text | Client's email |
| client_company | text | Company name |
| project_name | text | Project/campaign name |
| order_date | date | Order creation date |
| due_date | date | Expected completion date |
| subtotal | numeric | Sum of all item prices |
| discount | numeric | Discount amount |
| total_amount | numeric | Final amount (subtotal - discount) |
| amount_paid | numeric | Total payments received |
| balance_due | numeric | Remaining balance |
| status | text | draft, confirmed, in_progress, completed, cancelled |
| payment_status | text | unpaid, partial, paid |

#### 2. `order_items`
Individual publications/items within an order.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_id | uuid | Reference to orders table |
| website | text | Publication website |
| keyword | text | Target keyword |
| client_url | text | Client's target URL |
| price | numeric | Client price (hidden from processing) |
| status | text | pending, content_ready, submitted, live, rejected |
| live_url | text | Published article URL |
| live_date | date | Publication date |
| processing_status | text | Workflow status (see below) |
| content_url | text | Draft content URL |
| content_notes | text | Notes about content |
| live_submitted_by | text | Who submitted the live URL |
| live_submitted_at | timestamp | When live URL was submitted |
| approved_by | text | Who approved the content |
| approved_at | timestamp | When content was approved |
| rejection_reason | text | Reason if content was rejected |

**Processing Status Values:**
- `not_started` - Not yet assigned or work not begun
- `in_progress` - Processing team is working on it
- `content_writing` - Content is being written
- `pending_approval` - Submitted for marketing approval
- `approved` - Content approved, ready to publish
- `publishing` - Being published
- `published` - Live on the website
- `payment_requested` - Payment request submitted
- `completed` - Payment received, item complete

#### 3. `order_item_assignments`
Tracks which processing team member is assigned to each item.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_item_id | uuid | Reference to order_items (unique) |
| assigned_to | text | Processing team member email |
| assigned_by | text | Marketing team member who assigned |
| assigned_at | timestamp | Assignment date/time |
| due_date | date | Expected completion date |
| priority | text | low, normal, high, urgent |
| notes | text | Assignment instructions |

#### 4. `processing_payment_requests`
Payment requests from processing team to accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_item_id | uuid | Reference to order_items |
| requested_by | text | Processing team member email |
| requested_at | timestamp | Request date/time |
| amount | numeric | Payment amount (cost, not client price) |
| payment_method | text | wise, paypal, bank_transfer |
| recipient_name | text | Payment recipient name |
| recipient_email | text | Payment recipient email |
| recipient_account_details | text | Bank/wallet details |
| notes | text | Additional notes |
| status | text | pending, approved, rejected, paid |
| reviewed_by | text | Accounts team member |
| reviewed_at | timestamp | Review date/time |
| review_notes | text | Review comments |
| paid_at | timestamp | Payment date/time |
| payment_reference | text | Transaction reference |
| payment_proof_url | text | Receipt/proof URL |

---

## API Endpoints

### Processing API (`/api/processing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/processing` | List tasks assigned to current user |
| GET | `/api/processing/stats` | Get task statistics |
| GET | `/api/processing/[itemId]` | Get single task details |
| PUT | `/api/processing/[itemId]` | Update task status/content |
| POST | `/api/processing/[itemId]/submit-approval` | Submit for marketing approval |
| POST | `/api/processing/[itemId]/submit-live` | Submit published URL |
| POST | `/api/processing/[itemId]/request-payment` | Create payment request |

### Accounts API (`/api/accounts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List payment requests |
| GET | `/api/accounts/stats` | Get payment statistics |
| GET | `/api/accounts/[requestId]` | Get single request details |
| PUT | `/api/accounts/[requestId]/review` | Approve or reject request |
| PUT | `/api/accounts/[requestId]/pay` | Mark as paid |

### Order Extensions (`/api/order`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/order/[id]/items/[itemId]/assign` | Assign item to processing |
| DELETE | `/api/order/[id]/items/[itemId]/assign` | Remove assignment |
| POST | `/api/order/[id]/items/[itemId]/approve` | Approve/reject content |
| GET | `/api/order/[id]/assignments` | List all assignments for order |

---

## Pages & Navigation

### Processing Page (`/dashboard/processing`)

**Access:** Processing team members (Abbas, Gokul)

**Tabs:**
1. **Overview** - Dashboard with task statistics
2. **My Tasks** - All assigned items with filters
3. **Pending Approval** - Items awaiting marketing approval
4. **Published** - Completed publications ready for payment
5. **Payment Status** - Track payment request status

**Key Features:**
- View only assigned tasks
- Update task progress status
- Submit content for approval
- Submit live URLs after publishing
- Request payment with invoice details
- Track payment request status

**Important:** Processing team cannot see client prices - only their payment amounts.

### Accounts Page (`/dashboard/accounts`)

**Access:** Accounts team members

**Tabs:**
1. **Overview** - Payment statistics dashboard
2. **Pending Requests** - New payment requests
3. **Approved** - Approved but not yet paid
4. **Paid** - Completed payments
5. **All Requests** - Full history with search

**Key Features:**
- Review payment requests
- Approve or reject with notes
- Mark payments as complete
- Add payment reference and proof
- Filter by status, method, date

### Order Page Extensions (`/dashboard/order`)

**Added Features:**
- **Processing Status Column** - Shows current workflow state
- **Assigned To Column** - Shows who is working on each item
- **Assign Button** - Assign unassigned items to processing team
- **Review Button** - Approve/reject content pending approval

---

## Permissions

### Role Configuration

```typescript
// /src/constants/auth.ts

admin: {
  canAccessOrder: true,
  canAccessProcessing: true,
  canAccessAccounts: true,
  // ... all permissions
}

marketing: {
  canAccessOrder: true,
  canAccessProcessing: false,
  canAccessAccounts: false,
}

processing: {
  canAccessOrder: false,
  canAccessProcessing: true,
  canAccessAccounts: false,
}

accounts: {
  canAccessOrder: false,
  canAccessProcessing: false,
  canAccessAccounts: true,
  canAccessPayments: true,
}
```

### Team Members

**Processing Team:**
- abbas@aggrandizedigital.com
- gokul@aggrandizedigital.com

**Marketing Team:**
- veera@aggrandizedigital.com
- saran@aggrandizedigital.com

**Accounts Team:**
- Configure via admin user management

---

## User Guides

### For Marketing Team

#### Assigning Items to Processing

1. Go to **Dashboard > Order**
2. Click on an order to view details
3. In the Publications table, find items without assignment
4. Click **Assign** button
5. Select processing team member
6. Set priority and due date
7. Add any special instructions
8. Click **Assign**

#### Approving Content

1. When processing submits content, status shows "Pending Approval"
2. Click **Review** button on the item
3. Review the content (check content URL if provided)
4. Click **Approve** or **Reject**
5. If rejecting, provide a reason

### For Processing Team

#### Working on Tasks

1. Go to **Dashboard > Processing**
2. View your assigned tasks in **My Tasks** tab
3. Click on a task to see details
4. Update status as you work:
   - `In Progress` - Started working
   - `Content Writing` - Writing the article
5. When content is ready, click **Submit for Approval**

#### After Approval

1. Check **My Tasks** for approved items
2. Publish the article on the website
3. Click **Submit Live URL**
4. Enter the published article URL
5. Status changes to "Published"

#### Requesting Payment

1. After publishing, click **Request Payment**
2. Enter:
   - Amount (your cost, not client price)
   - Payment method (Wise/PayPal/Bank)
   - Recipient details
   - Any notes
3. Submit request
4. Track status in **Payment Status** tab

### For Accounts Team

#### Reviewing Requests

1. Go to **Dashboard > Accounts**
2. Check **Pending Requests** tab
3. Click on a request to view details
4. Verify:
   - Amount is correct
   - Publication is live (check live URL)
   - Payment details are complete
5. Click **Approve** or **Reject**

#### Processing Payments

1. Go to **Approved** tab
2. Click on a request
3. Make the payment via the specified method
4. Click **Mark as Paid**
5. Enter:
   - Payment reference number
   - Proof URL (optional)
6. Submit

---

## Status Colors

### Order Status
| Status | Color | Hex |
|--------|-------|-----|
| Draft | Gray | #64748b |
| Confirmed | Blue | #3b82f6 |
| In Progress | Amber | #f59e0b |
| Completed | Green | #10b981 |
| Cancelled | Red | #ef4444 |

### Processing Status
| Status | Color | Hex |
|--------|-------|-----|
| Not Started | Gray | #64748b |
| In Progress | Blue | #3b82f6 |
| Content Writing | Purple | #8b5cf6 |
| Pending Approval | Amber | #f59e0b |
| Approved | Green | #10b981 |
| Rejected | Red | #ef4444 |

### Payment Request Status
| Status | Color | Hex |
|--------|-------|-----|
| Pending | Amber | #f59e0b |
| Approved | Blue | #3b82f6 |
| Rejected | Red | #ef4444 |
| Paid | Green | #10b981 |

### Priority
| Priority | Color | Hex |
|----------|-------|-----|
| Low | Gray | #64748b |
| Normal | Blue | #3b82f6 |
| High | Amber | #f59e0b |
| Urgent | Red | #ef4444 |

---

## File Structure

```
src/
├── types/
│   ├── orders.ts              # Order, OrderItem, OrderPayment types
│   └── processing.ts          # Processing workflow types
├── app/
│   ├── api/
│   │   ├── processing/
│   │   │   ├── route.ts
│   │   │   ├── stats/route.ts
│   │   │   └── [itemId]/
│   │   │       ├── route.ts
│   │   │       ├── submit-approval/route.ts
│   │   │       ├── submit-live/route.ts
│   │   │       └── request-payment/route.ts
│   │   ├── accounts/
│   │   │   ├── route.ts
│   │   │   ├── stats/route.ts
│   │   │   └── [requestId]/
│   │   │       ├── route.ts
│   │   │       ├── review/route.ts
│   │   │       └── pay/route.ts
│   │   └── order/
│   │       └── [id]/
│   │           ├── items/[itemId]/
│   │           │   ├── assign/route.ts
│   │           │   └── approve/route.ts
│   │           └── assignments/route.ts
│   └── dashboard/
│       ├── processing/
│       │   ├── page.tsx
│       │   ├── processing.module.css
│       │   └── components/
│       │       ├── overview/
│       │       ├── my-tasks/
│       │       ├── pending-approval/
│       │       ├── published/
│       │       ├── payment-status/
│       │       ├── task-detail/
│       │       └── payment-request/
│       ├── accounts/
│       │   ├── page.tsx
│       │   ├── accounts.module.css
│       │   └── components/
│       │       ├── overview/
│       │       ├── requests/
│       │       └── request-detail/
│       └── order/
│           └── components/
│               └── order-detail/
│                   ├── order-detail.tsx
│                   ├── assignment-dialog.tsx
│                   └── content-approval-dialog.tsx
├── constants/
│   └── auth.ts                # Role permissions
└── middleware.ts              # Route protection
```

---

## Security Considerations

1. **Price Hiding**: Processing team API endpoints exclude client price data
2. **Assignment Filtering**: Processing team only sees their assigned items
3. **Role-Based Access**: Middleware enforces page access by permission
4. **RLS Policies**: Database-level row security enabled

---

## Future Enhancements

- [ ] Email notifications for status changes
- [ ] Slack/Discord integration
- [ ] Automatic deadline reminders
- [ ] Bulk assignment feature
- [ ] Performance analytics dashboard
- [ ] Mobile-responsive improvements

---

## Troubleshooting

### Common Issues

**Q: Processing team sees no tasks**
A: Ensure items are assigned via Order page. Check `order_item_assignments` table.

**Q: Payment request fails**
A: Verify the item has `processing_status = 'published'` and live_url is set.

**Q: Cannot access Accounts page**
A: User needs `canAccessAccounts: true` permission. Update in admin panel.

**Q: Assignment button not showing**
A: Item may already be assigned. Check the "Assigned To" column.

---

*Last Updated: December 2024*
*Version: 1.0*
