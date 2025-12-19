# Order Dashboard Implementation Guide

## Overview
This document contains everything needed to complete the Order Dashboard implementation on the AGGRANDIZE platform.

---

## Quick Access

### Umbrel Server Access
```bash
# SSH into Umbrel (same network required)
ssh umbrel@umbrel.local
# Password: Nodes@ADS003

# Check PostgreSQL is running
docker ps | grep postgres

# If PostgreSQL is not running, start it:
docker start aggrandize-postgres
```

### Development Server
```bash
# Start local dev server
cd /Users/dhanapale/aggrandize-dashboard
npm run dev

# Dev server runs on: http://localhost:3001
```

### Database Connection Details
```
Host: umbrel.local
Port: 5432
Database: aggrandize_business
User: aggrandize
Password: AggrandizeDB2024
```

### Test Database Connection
```bash
# Via API
curl http://localhost:3001/api/umbrel/status

# Direct test
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'umbrel.local',
  port: 5432,
  database: 'aggrandize_business',
  user: 'aggrandize',
  password: 'AggrandizeDB2024',
});
pool.query('SELECT NOW()').then(r => console.log('Connected:', r.rows[0])).finally(() => pool.end());
"
```

---

## Current Progress

### ✅ Completed (Phase 1)

1. **Database Tables Created**
   - `orders` - Main order table
   - `order_items` - Publications per order
   - `order_payments` - Payment tracking
   - `order_number_seq` - Sequence for order numbers

2. **TypeScript Interfaces**
   - File: `src/types/orders.ts`
   - Contains: Order, OrderItem, OrderPayment types
   - Includes: Status enums, color mappings, labels

3. **Umbrel API Functions**
   - File: `src/lib/umbrel/api.ts`
   - Functions added:
     - `generateOrderNumber()` - Creates AGG-YYYY-NNN
     - `getOrders()` - List with filters
     - `getOrderById()` - Single order
     - `createOrder()` - New order
     - `updateOrder()` - Modify order
     - `deleteOrder()` - Remove order
     - `recalculateOrderTotals()` - Auto-calc pricing
     - `getOrderStats()` - Dashboard stats
     - `getOrderItems()` - Items for order
     - `addOrderItem()` - Add publication
     - `updateOrderItem()` - Modify item
     - `deleteOrderItem()` - Remove item
     - `getOrderPayments()` - Payments list
     - `addOrderPayment()` - Record payment
     - `deleteOrderPayment()` - Remove payment

---

### ⏳ Remaining Tasks (Phases 2-4)

## Phase 2: API Routes

### Create these files:

#### 1. `/src/app/api/order/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder, getOrderStats } from '@/lib/umbrel';

// GET /api/order - List orders with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filters = {
    status: searchParams.get('status') || undefined,
    payment_status: searchParams.get('payment_status') || undefined,
    client_name: searchParams.get('client') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    search: searchParams.get('search') || undefined,
  };

  try {
    const orders = await getOrders(filters);
    const stats = await getOrderStats();
    return NextResponse.json({ success: true, orders, stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST /api/order - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const order = await createOrder(body);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

#### 2. `/src/app/api/order/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrder, deleteOrder, getOrderItems, getOrderPayments } from '@/lib/umbrel';

// GET /api/order/[id] - Get single order with items and payments
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const items = await getOrderItems(params.id);
    const payments = await getOrderPayments(params.id);

    return NextResponse.json({ success: true, order: { ...order, items, payments } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT /api/order/[id] - Update order
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const order = await updateOrder(params.id, body);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE /api/order/[id] - Delete order
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteOrder(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

#### 3. `/src/app/api/order/[id]/items/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getOrderItems, addOrderItem, updateOrderItem, deleteOrderItem } from '@/lib/umbrel';

// GET - List items
// POST - Add item
// (Include PUT/DELETE for individual items)
```

#### 4. `/src/app/api/order/[id]/payments/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getOrderPayments, addOrderPayment, deleteOrderPayment } from '@/lib/umbrel';

// GET - List payments
// POST - Add payment
// DELETE - Remove payment
```

---

## Phase 3: UI Components

### File Structure to Create
```
src/app/dashboard/order/
├── page.tsx                    # Main page (replace placeholder)
├── order.module.css            # Styling
└── components/
    ├── overview/
    │   └── order-overview.tsx  # Stats dashboard
    ├── orders/
    │   ├── orders-tab.tsx      # List orchestrator
    │   ├── order-list.tsx      # Data table
    │   └── order-form.tsx      # Create/Edit modal
    ├── order-detail/
    │   └── order-detail.tsx    # Single order view
    └── publication-selector/
        └── publication-selector.tsx  # Pick from inventory
```

### Reference Files
- Finance Dashboard pattern: `src/app/dashboard/payments/page.tsx`
- Inventory patterns: `src/app/api/inventory/route.ts`
- UI components: MUI (Material-UI)

---

## Phase 4: Integration & Polish

1. **Connect to website_inventory** for publication selection
2. **Order number auto-generation** (already implemented in API)
3. **Payment tracking** with partial payment support
4. **Status workflow** with visual indicators
5. **Export functionality** (CSV/Excel)

---

## Database Schema Reference

### orders
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_number | TEXT | AGG-YYYY-NNN format |
| client_name | TEXT | Customer name |
| client_email | TEXT | Email (optional) |
| client_company | TEXT | Company (optional) |
| project_name | TEXT | Campaign name |
| order_date | DATE | Order creation date |
| due_date | DATE | Expected completion |
| subtotal | DECIMAL | Sum of items |
| discount | DECIMAL | Discount amount |
| total_amount | DECIMAL | subtotal - discount |
| amount_paid | DECIMAL | Sum of payments |
| balance_due | DECIMAL | total - paid |
| status | TEXT | draft/confirmed/in_progress/completed/cancelled |
| payment_status | TEXT | unpaid/partial/paid |
| notes | TEXT | Additional notes |
| created_by | TEXT | User who created |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### order_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | FK to orders |
| publication_id | UUID | FK to website_inventory |
| website | TEXT | Publication domain |
| keyword | TEXT | Anchor text |
| client_url | TEXT | Link destination |
| price | DECIMAL | Item price |
| status | TEXT | pending/content_ready/submitted/live/rejected |
| live_url | TEXT | Published URL |
| live_date | DATE | When went live |
| notes | TEXT | Additional notes |

### order_payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | FK to orders |
| amount | DECIMAL | Payment amount |
| payment_method | TEXT | PayPal/Wise/Bank/etc |
| reference_number | TEXT | Transaction ref |
| payment_date | DATE | When paid |
| notes | TEXT | Additional notes |

---

## Testing Commands

### Test Order API (after routes are created)
```bash
# List orders
curl http://localhost:3001/api/order

# Create order
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Test Client", "project_name": "Test Campaign"}'

# Get single order
curl http://localhost:3001/api/order/{ORDER_ID}

# Update order status
curl -X PUT http://localhost:3001/api/order/{ORDER_ID} \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'

# Add item to order
curl -X POST http://localhost:3001/api/order/{ORDER_ID}/items \
  -H "Content-Type: application/json" \
  -d '{"website": "example.com", "keyword": "best product", "client_url": "https://client.com", "price": 150}'

# Add payment
curl -X POST http://localhost:3001/api/order/{ORDER_ID}/payments \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "payment_method": "PayPal"}'
```

---

## Git Status

### Files Created/Modified
- `src/types/orders.ts` - NEW
- `src/lib/umbrel/api.ts` - MODIFIED (order functions added)
- `src/app/api/umbrel/test/route.ts` - NEW (testing endpoint)

### To Commit When Ready
```bash
git add -A
git commit -m "feat: Add Order Dashboard - Phase 1 (database, types, API functions)"
git push origin main
```

---

## Resume Implementation

When ready to continue:

1. **Connect to Umbrel network**
2. **Start dev server**: `npm run dev`
3. **Test connection**: `curl http://localhost:3001/api/umbrel/status`
4. **Continue from Phase 2**: Create API routes
5. **Then Phase 3**: Build UI components
6. **Finally Phase 4**: Integration and polish

---

## Support

- Plan file: `/Users/dhanapale/.claude/plans/cheeky-watching-cray.md`
- CLAUDE.md: Project documentation
- Umbrel docs: Self-hosted PostgreSQL on local network
