# Create New Order

Guide through creating a new PR publishing order in the AGGRANDIZE Dashboard.

## Workflow

### Step 1: Gather Order Information
Ask the user for:
- **Client**: Name or select from existing clients
- **Project Name**: Campaign or project identifier
- **Order Date**: Default to today
- **Due Date**: When the order should be completed

### Step 2: Select Publications
Help user select publication sites from inventory:
- Show available publications with key metrics (DA, DR, Price, TAT)
- Allow filtering by category, price range, or authority
- For each selected publication, ask for:
  - **Keyword**: The anchor text for the link
  - **Client URL**: The brand/client link to insert
  - **Price**: Confirm or adjust from inventory price

### Step 3: Review Order
Display order summary:
- Client details
- All publications with keywords and URLs
- Total amount
- Expected completion date based on TAT

### Step 4: Create Order
If using dashboard UI:
- Navigate to `/dashboard/order`
- Guide through the order creation form

If using API directly:
- Create order via API endpoints
- Report the generated Order Number (e.g., AGG-2025-001)

### Step 5: Payment Setup
Ask if user wants to record an upfront payment:
- Payment amount
- Payment method (PayPal, Wise, Bank Transfer, etc.)
- Reference number (if any)

## Notes
- Order numbers are auto-generated in format: AGG-YYYY-NNN
- Prices are in USD by default (can be converted to INR at 83.5 rate)
- TAT is calculated from the maximum TAT of selected publications
