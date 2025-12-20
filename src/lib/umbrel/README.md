# Umbrel Database Layer

Comprehensive database access layer for the Aggrandize Dashboard with support for both direct PostgreSQL connections and API-based access through Cloudflare.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Aggrandize Dashboard                      │
│                   (Next.js Application)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Unified Client Layer                      │
│         (Automatic mode switching & fallback logic)          │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  Direct Client  │         │   API Client    │
    │  (PostgreSQL)   │         │ (HTTP/REST API) │
    └─────────────────┘         └─────────────────┘
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  Umbrel Server  │         │  Cloudflare CDN │
    │   (Local Net)   │         │   + API Server  │
    └─────────────────┘         └─────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
                  ┌──────────────────┐
                  │  PostgreSQL DB   │
                  │   (Umbrel)       │
                  └──────────────────┘
```

## Components

### 1. Direct PostgreSQL Client (`client.ts`)

Direct connection to Umbrel PostgreSQL database (same network).

**Features:**
- Connection pooling with pg library
- Automatic reconnection
- Query logging and performance monitoring
- Error handling

**Usage:**
```typescript
import { query, queryOne, testConnection } from '@/lib/umbrel/client';

// Execute query
const result = await query('SELECT * FROM expenses WHERE id = $1', [expenseId]);

// Get single row
const expense = await queryOne('SELECT * FROM expenses WHERE id = $1', [expenseId]);

// Test connection
const isConnected = await testConnection();
```

### 2. API Functions (`api.ts`)

High-level business logic functions that wrap database operations.

**Features:**
- CRUD operations for all business entities
- Filter and search support
- Join queries for related data
- Transaction support

**Entities:**
- Expenses
- Salaries
- Utility Bills
- Subscriptions
- Settlements
- Orders & Order Items
- Website Inventory
- Todos

**Usage:**
```typescript
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/umbrel/api';

// Get filtered expenses
const expenses = await getExpenses({
  category_id: 'cat_123',
  payment_status: 'paid',
  date_from: '2024-01-01',
  search: 'office supplies'
});

// Create new expense
const newExpense = await createExpense({
  amount_inr: 5000,
  category_id: 'cat_123',
  person_paid: 'Dhana',
  purpose: 'Office supplies',
  payment_method_id: 'pm_123',
  expense_date: '2024-12-20'
});
```

### 3. API Client (`api-client.ts`)

HTTP client for Cloudflare-proxied API endpoint.

**Features:**
- RESTful HTTP methods (GET, POST, PUT, DELETE)
- API key authentication via X-API-Key header
- Timeout support with AbortController
- Health check endpoint
- Error handling and logging

**Configuration:**
```bash
# .env
UMBREL_API_URL=https://api.aggrandizedigital.com
UMBREL_API_KEY=your-secret-api-key
```

**Usage:**
```typescript
import { apiClient } from '@/lib/umbrel/api-client';

// Health check
const health = await apiClient.healthCheck();

// GET request
const expenses = await apiClient.get('/expenses');

// POST request
const newExpense = await apiClient.post('/expenses', {
  amount_inr: 5000,
  purpose: 'Office supplies'
});

// PUT request
const updated = await apiClient.put('/expenses/123', {
  payment_status: 'paid'
});

// DELETE request
await apiClient.delete('/expenses/123');
```

### 4. Query Wrapper (`query-wrapper.ts`)

Unified query interface that auto-switches between direct PostgreSQL and HTTP API.

**Connection Modes:**

1. **`direct`** - Use direct PostgreSQL connection (default)
2. **`api`** - Use HTTP API connection through Cloudflare

**Features:**
- Same interface as direct client (`query`, `queryOne`)
- Environment-based mode switching
- Dynamic import for optimal performance
- Compatible with all existing code using `client.ts`

**Configuration:**
```bash
# .env - Use API mode
UMBREL_CONNECTION_MODE=api
UMBREL_API_URL=https://api.aggrandizedigital.com
UMBREL_API_KEY=your-secret-api-key

# .env - Use Direct mode (default)
UMBREL_CONNECTION_MODE=direct  # or leave unset
UMBREL_SSH_HOST=umbrel.local
UMBREL_DB_PORT=5432
UMBREL_DB_NAME=aggrandize_business
UMBREL_DB_USER=aggrandize
UMBREL_DB_PASSWORD=your-db-password
```

**Usage:**
```typescript
import { query, queryOne, testConnection, getMode } from '@/lib/umbrel/query-wrapper';

// Check current mode
console.log('Connection mode:', getMode()); // 'direct' or 'api'

// Execute query (works in both modes)
const result = await query('SELECT * FROM expenses WHERE id = $1', [expenseId]);

// Get single row
const expense = await queryOne('SELECT * FROM expenses WHERE id = $1', [expenseId]);

// Test connection
const isConnected = await testConnection();
```

**Migration:**
```typescript
// Before
import { query, queryOne } from '@/lib/umbrel/client';

// After (drop-in replacement)
import { query, queryOne } from '@/lib/umbrel/query-wrapper';
```

**Updated Routes:**
All inventory API routes now use the query wrapper:
- `/api/inventory` - List and create websites
- `/api/inventory/[id]` - Get, update, delete single website
- `/api/inventory/bulk` - Bulk operations
- `/api/inventory/export` - Export data

### 5. Unified Client (`unified-client.ts`)

Intelligent connection manager with automatic mode switching and fallback.

**Connection Modes:**

1. **`direct`** - Only use direct PostgreSQL connection
2. **`api`** - Only use API connection
3. **`auto`** - Try direct first, fallback to API (recommended)

**Features:**
- Automatic connection testing
- Result caching (1-minute TTL)
- Fallback logic in auto mode
- Status monitoring
- Manual cache invalidation

**Configuration:**
```bash
# .env
UMBREL_CONNECTION_MODE=auto  # Options: direct, api, auto
```

**Usage:**
```typescript
import {
  determineConnection,
  getConnectionMode,
  getConnectionStatus,
  clearConnectionCache,
  setConnectionMode
} from '@/lib/umbrel/unified-client';

// Determine which connection to use
const connection = await determineConnection(); // Returns 'direct' or 'api'

// Get current mode
const mode = getConnectionMode(); // Returns 'direct', 'api', or 'auto'

// Get detailed status
const status = getConnectionStatus();
// {
//   mode: 'auto',
//   activeConnection: 'direct',
//   directAvailable: true,
//   apiAvailable: true,
//   lastChecked: Date,
//   error?: string
// }

// Clear cache to force re-check
clearConnectionCache();

// Change mode
setConnectionMode('api');
```

## Environment Variables

### Direct PostgreSQL Connection
```bash
UMBREL_SSH_HOST=umbrel.local
UMBREL_DB_PORT=5432
UMBREL_DB_NAME=aggrandize_business
UMBREL_DB_USER=aggrandize
UMBREL_DB_PASSWORD=your-db-password
```

### API Connection
```bash
UMBREL_API_URL=https://api.aggrandizedigital.com
UMBREL_API_KEY=your-secret-api-key
```

### Connection Mode
```bash
UMBREL_CONNECTION_MODE=auto  # Options: direct, api, auto (default)
```

## Error Handling

All functions throw errors that should be caught and handled:

```typescript
try {
  const expenses = await getExpenses();
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to fetch expenses:', error.message);
  }
}
```

## Performance Considerations

### Direct Connection
- ✅ Fastest (same network)
- ✅ No API overhead
- ❌ Requires VPN/local network access
- ❌ Database credentials needed

### API Connection
- ✅ Works from anywhere (internet)
- ✅ Cloudflare CDN benefits
- ✅ No database credentials on client
- ❌ Slightly slower (HTTP overhead)
- ❌ API key management required

### Auto Mode (Recommended)
- ✅ Best of both worlds
- ✅ Automatic failover
- ✅ Optimal performance when available
- ⚠️ Slight delay on first request (connection test)

## Security

### Direct Connection
- PostgreSQL credentials in environment variables
- Connection pooling with SSL support (if configured)
- Row Level Security (RLS) policies on all tables

### API Connection
- API key authentication (X-API-Key header)
- HTTPS/TLS encryption via Cloudflare
- Rate limiting on API server
- IP whitelisting (optional)

## Migration Guide

### From Direct-Only to Unified

**Before:**
```typescript
import { query } from '@/lib/umbrel/client';

const result = await query('SELECT * FROM expenses');
const expenses = result.rows;
```

**After:**
```typescript
import { getExpenses } from '@/lib/umbrel/api';

const expenses = await getExpenses();
// Automatically uses best available connection
```

## Testing

### Test Direct Connection
```typescript
import { testConnection } from '@/lib/umbrel/client';

const isConnected = await testConnection();
console.log('Direct connection:', isConnected);
```

### Test API Connection
```typescript
import { apiClient } from '@/lib/umbrel/api-client';

try {
  const health = await apiClient.healthCheck();
  console.log('API connection:', health);
} catch (error) {
  console.error('API connection failed:', error);
}
```

### Test Unified Client
```typescript
import { determineConnection, getConnectionStatus } from '@/lib/umbrel/unified-client';

try {
  const connection = await determineConnection();
  const status = getConnectionStatus();

  console.log('Using connection:', connection);
  console.log('Status:', status);
} catch (error) {
  console.error('No connections available:', error);
}
```

## Troubleshooting

### "Direct PostgreSQL connection not available"
1. Check if Umbrel server is running
2. Verify network connectivity
3. Confirm environment variables are correct
4. Check PostgreSQL is accepting connections

### "API connection not available"
1. Verify UMBREL_API_URL is correct
2. Check UMBREL_API_KEY is set
3. Ensure API server is running
4. Test endpoint: `curl https://api.aggrandizedigital.com/health`

### "No Umbrel connections available"
1. Check both direct and API connections individually
2. Review logs for specific error messages
3. Verify environment variables
4. Clear connection cache: `clearConnectionCache()`

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Connection pooling for API client
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker pattern
- [ ] Request/response caching
- [ ] GraphQL endpoint option
- [ ] Read replica support
- [ ] Query builder abstraction
