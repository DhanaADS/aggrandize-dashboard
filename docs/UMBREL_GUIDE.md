# Aggrandize Dashboard + Umbrel Database - Developer Guide

> Complete guide for new developers to understand how the Aggrandize Dashboard connects to the Umbrel PostgreSQL database.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [PostgreSQL Installation](#postgresql-installation) ⭐ **NEW**
5. [Connection Modes](#connection-modes)
6. [Key Files](#key-files)
7. [Data Flow](#data-flow)
8. [Auto-Restart (PM2 + PostgreSQL)](#auto-restart)
9. [Environment Variables](#environment-variables)
10. [Security](#security)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [API Reference](#api-reference)

---

## Overview

The Aggrandize Dashboard is a Next.js application hosted on Vercel that connects to a PostgreSQL database running on an Umbrel home server (Raspberry Pi). The connection is made secure and accessible from anywhere using Cloudflare Tunnel.

**Key Points:**
- Dashboard runs on Vercel (cloud)
- Database runs on Umbrel (self-hosted Raspberry Pi)
- Cloudflare Tunnel provides secure internet access
- Two connection modes: API (production) and Direct (development)

---

## Tech Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend** | Next.js + TypeScript | 15.4.5 | Dashboard UI & API routes |
| **Hosting** | Vercel | - | Frontend deployment & serverless |
| **Backend API** | Express.js + Node.js | 4.x / 18.x | Database proxy on Umbrel |
| **Database** | PostgreSQL | 15 | Primary data storage |
| **Tunnel** | Cloudflare Tunnel | - | Secure internet access |
| **Process Manager** | PM2 | 6.x | Auto-restart services (cluster mode) |
| **Auth** | NextAuth.js + Google OAuth | 4.x | User authentication |
| **Secondary DB** | Supabase | - | User profiles & auth |
| **Styling** | CSS Modules + MUI | - | Component styling |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Cloud)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Next.js 15 Dashboard                       │   │
│  │  • src/app/           (Pages & API Routes)          │   │
│  │  • src/lib/umbrel/    (Database Connection Layer)   │   │
│  │  • src/components/    (React Components)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS Request
                              │ (UMBREL_CONNECTION_MODE=api)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE                               │
│  • DNS: api.aggrandizedigital.com                          │
│  • TLS/SSL Termination                                      │
│  • DDoS Protection & WAF                                    │
│  • CDN & Caching                                            │
│  • Tunnel Connection (QUIC protocol)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Cloudflare Tunnel
                              │ (Encrypted, no exposed ports)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 UMBREL (Raspberry Pi 4)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  cloudflared.service                                 │   │
│  │  • Restart: always (reconnects on any failure)       │   │
│  │  • Routes: api.aggrandizedigital.com → localhost:3333│   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PM2: umbrel-api (Express.js, cluster mode)          │   │
│  │  • Port: 3333                                        │   │
│  │  • Restart: auto (pm2 startup + pm2 save)            │   │
│  │  • Auth: X-API-Key + X-ADMIN-KEY headers             │   │
│  │  • Rate Limit: 100 req/min per IP                    │   │
│  │  • CORS: Configured allowed origins                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 15 (systemctl managed)                   │   │
│  │  • Database: aggrandize_business                     │   │
│  │  • Port: 5432 (localhost only)                       │   │
│  │  • Pool: 20 max connections                          │   │
│  │  • Auto-start: systemctl enable postgresql           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Location: /home/umbrel/umbrel-api/                         │
└─────────────────────────────────────────────────────────────┘
```

---

## PostgreSQL Installation

> ⚠️ **IMPORTANT**: PostgreSQL must be installed as a system service to persist after Umbrel restarts.

### Step 1: Install PostgreSQL

```bash
# SSH to Umbrel
ssh umbrel@umbrel.local

# Install PostgreSQL
sudo apt update && sudo apt install postgresql postgresql-contrib -y
```

### Step 2: Enable Auto-Start on Boot

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable auto-start (survives reboots)
sudo systemctl enable postgresql

# Verify it's running
sudo systemctl status postgresql
```

### Step 3: Create Database and User

```bash
# Switch to postgres user and create everything
sudo -u postgres psql << 'EOF'
-- Create user
CREATE USER aggrandize WITH PASSWORD 'AggrandizeDB2024';

-- Create database
CREATE DATABASE aggrandize_business OWNER aggrandize;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE aggrandize_business TO aggrandize;

-- Connect to database and grant schema permissions
\c aggrandize_business
GRANT ALL ON SCHEMA public TO aggrandize;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aggrandize;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aggrandize;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO aggrandize;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO aggrandize;
EOF
```

### Step 4: Configure Password Authentication

```bash
# Edit pg_hba.conf to allow password authentication
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this line (or modify existing local line):
# local   all   aggrandize   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 5: Verify Installation

```bash
# Test connection
psql -h localhost -U aggrandize -d aggrandize_business -c "SELECT 1 AS test;"

# Should output:
#  test
# ------
#     1
```

### Quick One-Liner Setup

For fresh installs, run this complete setup:

```bash
sudo apt update && sudo apt install postgresql postgresql-contrib -y && \
sudo systemctl start postgresql && \
sudo systemctl enable postgresql && \
sudo -u postgres psql -c "CREATE USER aggrandize WITH PASSWORD 'AggrandizeDB2024';" && \
sudo -u postgres psql -c "CREATE DATABASE aggrandize_business OWNER aggrandize;" && \
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aggrandize_business TO aggrandize;" && \
echo "PostgreSQL installed and configured!"
```

---

## Connection Modes

The dashboard supports **two connection modes** controlled by `UMBREL_CONNECTION_MODE`:

### 1. API Mode (Production)

```
UMBREL_CONNECTION_MODE=api
```

**Flow:**
```
Next.js → HTTPS → Cloudflare → Tunnel → Express API → PostgreSQL
```

**Characteristics:**
- Works from anywhere on the internet
- Latency: 100-200ms
- Used by Vercel deployment
- Requires API keys for authentication

**When to use:**
- Production deployment on Vercel
- Remote development
- Any location without direct network access to Umbrel

### 2. Direct Mode (Development)

```
UMBREL_CONNECTION_MODE=direct
```

**Flow:**
```
Next.js → TCP → umbrel.local:5432 → PostgreSQL
```

**Characteristics:**
- Requires same network as Umbrel
- Latency: 5-20ms (much faster)
- Direct database connection
- No API server needed

**When to use:**
- Local development on office network
- Testing with same LAN as Umbrel
- Faster queries during development

---

## Key Files

### Dashboard Connection Layer

```
src/lib/umbrel/
├── query-wrapper.ts      # Main entry point - auto-switches modes
├── api-client.ts         # HTTP client for API mode requests
├── client.ts             # Direct PostgreSQL connection (pg library)
├── unified-client.ts     # Smart mode selection with fallback
├── api.ts                # High-level CRUD functions (1200+ lines)
├── ssh-tunnel.ts         # Optional SSH port forwarding
└── index.ts              # Module exports
```

**Key File: `query-wrapper.ts`**
```typescript
// Determines mode and routes queries
function getConnectionMode(): ConnectionMode {
  const mode = process.env.UMBREL_CONNECTION_MODE?.trim().toLowerCase();
  if (mode === 'api') return 'api';
  return 'direct';
}

export async function query<T>(text: string, params?: unknown[]) {
  if (getConnectionMode() === 'api') {
    return queryViaApi<T>(text, params);
  }
  return queryViaDirect<T>(text, params);
}
```

### Umbrel API Server

```
umbrel-api/
├── src/
│   ├── server.js              # Express app initialization
│   ├── db.js                  # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js            # X-API-Key validation
│   │   └── admin-auth.js      # X-ADMIN-KEY for migrations
│   └── routes/
│       ├── health.js          # GET /health
│       ├── query.js           # POST /query (admin SQL)
│       ├── migrate.js         # POST /migrate/* (schema)
│       ├── expenses.js        # /expenses CRUD
│       ├── salaries.js        # /salaries CRUD
│       ├── orders.js          # /orders CRUD
│       ├── inventory.js       # /inventory CRUD
│       └── ...
├── umbrel-api.service         # systemd service definition
├── cloudflared.service        # Tunnel service definition
├── cloudflared-config.yml     # Tunnel routing config
├── package.json               # Dependencies
├── .env                       # Production config (not in git)
└── .env.example               # Template
```

---

## Data Flow

### Example: Creating an Order

```
Step 1: User Action
├── User clicks "Create Order" button
└── React form submits data

Step 2: API Call (src/app/dashboard/order/page.tsx)
├── Component calls: await createOrder(orderData)
└── Imports from: src/lib/umbrel/api.ts

Step 3: Business Logic (src/lib/umbrel/api.ts:923)
├── createOrder() generates order number
├── Builds INSERT SQL query
└── Calls: await queryOne(sql, params)

Step 4: Query Wrapper (src/lib/umbrel/query-wrapper.ts)
├── Checks: UMBREL_CONNECTION_MODE === 'api'
├── Routes to: queryViaApi()
└── Builds HTTP request

Step 5: HTTP Request
├── POST https://api.aggrandizedigital.com/query
├── Headers: X-API-Key, X-ADMIN-KEY
└── Body: { sql: "INSERT INTO orders...", params: [...] }

Step 6: Cloudflare Tunnel
├── DNS resolves api.aggrandizedigital.com
├── Routes through Cloudflare edge
└── Tunnels to Umbrel localhost:3333

Step 7: Express Server (umbrel-api/src/server.js)
├── Receives request on port 3333
├── Validates X-API-Key (auth.js middleware)
└── Validates X-ADMIN-KEY (admin-auth.js)

Step 8: Query Execution (umbrel-api/src/routes/query.js)
├── Extracts SQL and params from body
├── Calls: db.queryOne(sql, params)
└── PostgreSQL executes INSERT

Step 9: Database (PostgreSQL)
├── Inserts new order row
├── Returns: { id: 'uuid...', order_number: 'ORD-001', ... }
└── Triggers update timestamps

Step 10: Response Flow
├── Express sends: { success: true, rows: [...] }
├── Tunnel routes response back
├── Cloudflare delivers to Vercel
└── Dashboard updates UI with new order
```

---

## Auto-Restart

Services are managed by **PM2** (umbrel-api) and **systemctl** (PostgreSQL, cloudflared).

### PM2 for umbrel-api

The Express API server runs under PM2 in cluster mode:

```bash
# Check PM2 status
pm2 status

# Output:
# ┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
# │ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
# ├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
# │ 0  │ umbrel-api         │ cluster  │ 0    │ online    │ 0%       │ 66.0mb   │
# └────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### PM2 Auto-Start Setup (One-Time Configuration)

> ⚠️ **IMPORTANT**: You must run these commands once to ensure umbrel-api survives reboots!

```bash
# Step 1: Generate startup script
pm2 startup

# Step 2: Copy and run the command it outputs, which looks like:
sudo env PATH=$PATH:/home/umbrel/.nvm/versions/node/v20.19.2/bin /home/umbrel/.nvm/versions/node/v20.19.2/lib/node_modules/pm2/bin/pm2 startup systemd -u umbrel --hp /home/umbrel

# Step 3: Save the current process list
pm2 save

# Verify: Should show "Successfully saved"
```

**What this does:**
- Creates `/etc/systemd/system/pm2-umbrel.service`
- Enables automatic startup via `systemctl enable pm2-umbrel`
- Saves process list to `/home/umbrel/.pm2/dump.pm2`

### PostgreSQL (systemctl)

PostgreSQL runs as a system service:

```bash
# Check status
sudo systemctl status postgresql

# Start/Stop
sudo systemctl start postgresql
sudo systemctl stop postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql
```

### cloudflared (systemctl)

Cloudflare Tunnel runs as a system service:

```bash
# Check status
sudo systemctl status cloudflared

# Restart if needed
sudo systemctl restart cloudflared
```

### Monitoring Commands

```bash
# SSH into Umbrel
ssh umbrel@umbrel.local

# ═══════════════════════════════════════════
# PM2 Commands (umbrel-api)
# ═══════════════════════════════════════════
pm2 status                    # Check all processes
pm2 logs umbrel-api           # View live logs
pm2 logs umbrel-api --lines 100  # Last 100 lines
pm2 restart umbrel-api        # Restart API
pm2 stop umbrel-api           # Stop API
pm2 start umbrel-api          # Start API
pm2 monit                     # Real-time monitoring

# ═══════════════════════════════════════════
# PostgreSQL Commands
# ═══════════════════════════════════════════
sudo systemctl status postgresql    # Check status
sudo systemctl restart postgresql   # Restart
sudo systemctl start postgresql     # Start
sudo systemctl enable postgresql    # Enable auto-start

# ═══════════════════════════════════════════
# Cloudflared Commands
# ═══════════════════════════════════════════
sudo systemctl status cloudflared   # Check status
sudo journalctl -u cloudflared -f   # View logs
sudo systemctl restart cloudflared  # Restart
```

### Restart Order After Umbrel Reboot

When Umbrel restarts, services should start in this order:
1. **PostgreSQL** (systemctl, auto-starts)
2. **umbrel-api** (PM2, auto-starts if configured with `pm2 startup` + `pm2 save`)
3. **cloudflared** (systemctl, auto-starts)

If something doesn't start automatically:

```bash
# Start everything manually
sudo systemctl start postgresql
pm2 start umbrel-api
sudo systemctl start cloudflared
```

---

## Environment Variables

### Dashboard (.env.local)

```bash
# ============================================
# Connection Mode (REQUIRED)
# ============================================
UMBREL_CONNECTION_MODE=api   # 'api' or 'direct'

# ============================================
# API Mode Configuration (for Vercel)
# ============================================
# Server-side (Next.js API routes)
UMBREL_API_URL=https://api.aggrandizedigital.com
UMBREL_API_KEY=e622c42ee210f3ad0af8ec91ec92d164cfb16e3e9ecec5e991eb6fe2ece2180e
UMBREL_ADMIN_KEY=v4+qGvUcO3A0Gqhstn84pWu9v2E2xnZ5DlPCtvafvKs=

# Client-side (browser requests)
NEXT_PUBLIC_UMBREL_API_URL=https://api.aggrandizedigital.com
NEXT_PUBLIC_UMBREL_API_KEY=e622c42ee210f3ad0af8ec91ec92d164cfb16e3e9ecec5e991eb6fe2ece2180e
NEXT_PUBLIC_UMBREL_ADMIN_KEY=v4+qGvUcO3A0Gqhstn84pWu9v2E2xnZ5DlPCtvafvKs=

# ============================================
# Direct Mode Configuration (for local dev)
# ============================================
UMBREL_DB_HOST=umbrel.local
UMBREL_DB_PORT=5432
UMBREL_DB_NAME=aggrandize_business
UMBREL_DB_USER=aggrandize
UMBREL_DB_PASSWORD=AggrandizeDB2024

# ============================================
# Authentication (Supabase + NextAuth)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-secret>
```

### Umbrel API (.env)

```bash
# ============================================
# Server Configuration
# ============================================
PORT=3333
NODE_ENV=production

# ============================================
# Security Keys
# ============================================
# Generate with: openssl rand -hex 32
API_KEY=e622c42ee210f3ad0af8ec91ec92d164cfb16e3e9ecec5e991eb6fe2ece2180e

# Separate key for admin operations
# Generate with: openssl rand -base64 32
ADMIN_KEY=v4+qGvUcO3A0Gqhstn84pWu9v2E2xnZ5DlPCtvafvKs=

# Tables that cannot be modified via API
PROTECTED_TABLES=_migrations,_migration_audit,user_profiles

# ============================================
# Database Connection
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aggrandize_business
DB_USER=aggrandize
DB_PASSWORD=AggrandizeDB2024

# ============================================
# CORS Configuration
# ============================================
ALLOWED_ORIGINS=https://aggrandize-dashboard-teamads.vercel.app,https://aggrandizedigital.com,http://localhost:3000,http://localhost:3001

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_WINDOW_MS=60000      # 60 seconds
RATE_LIMIT_MAX_REQUESTS=100     # per IP per window
```

---

## Security

The system implements **7 layers of security**:

### 1. Cloudflare Tunnel
- No ports exposed on Umbrel
- All traffic encrypted
- Umbrel IP hidden from internet

### 2. API Key Authentication
- Required header: `X-API-Key`
- Validated on every request (except /health)
- Failed attempts logged with IP

### 3. Admin Key Authentication
- Required header: `X-ADMIN-KEY`
- Only for: `/query`, `/migrate/*`
- Separate from API key

### 4. Rate Limiting
- 100 requests per minute per IP
- Configurable via environment
- Returns 429 when exceeded

### 5. CORS Protection
- Only allowed origins can access
- Configured in ALLOWED_ORIGINS
- Blocks unauthorized domains

### 6. Helmet.js Security Headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Cross-Origin Resource Policy

### 7. PostgreSQL Security
- Localhost only access
- Strong password
- Connection pooling

---

## Deployment

### 1. Deploy Umbrel API

```bash
# From your development machine
cd aggrandize-dashboard
./scripts/deploy-umbrel-api.sh
```

This script:
- SSHs to Umbrel
- Copies API files
- Installs dependencies
- Configures systemd services
- Starts the API server

### 2. Setup Cloudflare Tunnel

```bash
# SSH to Umbrel first
ssh umbrel@umbrel.local

# Run setup script
cd ~/umbrel-api
./scripts/setup-cloudflare-tunnel.sh

# Follow prompts:
# 1. Enter Tunnel ID (from Cloudflare dashboard)
# 2. Paste credentials JSON
# 3. Test connection
# 4. Enable service
```

### 3. Configure DNS

In Cloudflare Dashboard:
1. Go to Zero Trust → Access → Tunnels
2. Find your tunnel
3. Add public hostname:
   - Subdomain: `api`
   - Domain: `aggrandizedigital.com`
   - Service: `http://localhost:3333`

### 4. Deploy Dashboard to Vercel

```bash
# Set environment variables first in Vercel dashboard
# Then deploy
npx vercel --prod
```

---

## Troubleshooting

### PostgreSQL Not Running After Reboot

> This is the most common issue! PostgreSQL must be installed as a system service.

```bash
# SSH to Umbrel
ssh umbrel@umbrel.local

# Check if PostgreSQL is installed
which psql

# If not installed:
sudo apt update && sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql

# Enable auto-start on boot (IMPORTANT!)
sudo systemctl enable postgresql

# Verify
sudo systemctl status postgresql
```

### API Not Responding

```bash
# 1. Check if Umbrel is online
ping umbrel.local

# 2. SSH and check services
ssh umbrel@umbrel.local

# 3. Check PM2 (umbrel-api)
pm2 status
pm2 logs umbrel-api --lines 50

# 4. Check PostgreSQL
sudo systemctl status postgresql

# 5. Check cloudflared
sudo systemctl status cloudflared

# 6. Restart everything if needed
sudo systemctl start postgresql
pm2 restart umbrel-api
sudo systemctl restart cloudflared
```

### Database Connection Failed (ECONNREFUSED)

Error: `connect ECONNREFUSED 127.0.0.1:5432`

```bash
# This means PostgreSQL is not running!

# 1. Start PostgreSQL
sudo systemctl start postgresql

# 2. Enable auto-start
sudo systemctl enable postgresql

# 3. Verify it's running
sudo systemctl status postgresql

# 4. Test connection
psql -h localhost -U aggrandize -d aggrandize_business -c "SELECT 1"

# 5. Check API health
curl https://api.aggrandizedigital.com/health
```

### PM2 Not Auto-Starting

```bash
# Setup PM2 auto-start
pm2 startup

# This outputs a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u umbrel --hp /home/umbrel

# Run that command, then:
pm2 save

# Verify
pm2 list
```

### Rate Limited (429 Error)

```bash
# Check rate limit headers in response
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: <timestamp>

# Wait 60 seconds or adjust RATE_LIMIT_MAX_REQUESTS in umbrel-api/.env
```

### Tunnel Disconnected

```bash
# Check cloudflared logs
sudo journalctl -u cloudflared -f

# Restart tunnel
sudo systemctl restart cloudflared

# If persists, re-authenticate
cloudflared tunnel login
```

### Complete Recovery After Reboot

If everything is down after an Umbrel reboot, run this sequence:

```bash
# SSH to Umbrel
ssh umbrel@umbrel.local

# 1. Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 2. Start umbrel-api via PM2
pm2 start umbrel-api
# If not in PM2 list, start fresh:
cd ~/umbrel-api && pm2 start src/server.js --name umbrel-api -i 1

# 3. Save PM2 state
pm2 save

# 4. Verify cloudflared
sudo systemctl status cloudflared
# If not running: sudo systemctl start cloudflared

# 5. Test API
curl https://api.aggrandizedigital.com/health
```

---

## API Reference

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Server & DB status |
| GET | `/health/stats` | Table record counts |

### Protected Endpoints (X-API-Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses` | List expenses |
| POST | `/expenses` | Create expense |
| GET | `/expenses/:id` | Get expense |
| PUT | `/expenses/:id` | Update expense |
| DELETE | `/expenses/:id` | Delete expense |
| GET | `/orders` | List orders |
| POST | `/orders` | Create order |
| GET | `/inventory` | List websites |
| POST | `/inventory` | Add website |

### Admin Endpoints (X-API-Key + X-ADMIN-KEY)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/query` | Execute raw SQL |
| GET | `/migrate` | List migrations |
| POST | `/migrate/run` | Run migration |
| GET | `/migrate/tables` | List all tables |
| POST | `/migrate/create-table` | Create table |
| DELETE | `/migrate/table/:name` | Drop table |

### Example Request

```bash
curl -X POST https://api.aggrandizedigital.com/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-ADMIN-KEY: your-admin-key" \
  -d '{
    "sql": "SELECT COUNT(*) FROM website_inventory"
  }'
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  AGGRANDIZE DASHBOARD - QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  URLS:                                                      │
│  • Dashboard: https://aggrandize-dashboard-teamads.vercel.app
│  • API: https://api.aggrandizedigital.com                   │
│  • Health: https://api.aggrandizedigital.com/health         │
│                                                             │
│  SSH:                                                       │
│  • ssh umbrel@umbrel.local                                  │
│  • Password: (ask admin)                                    │
│                                                             │
│  PM2 (umbrel-api):                                          │
│  • pm2 status                                               │
│  • pm2 logs umbrel-api                                      │
│  • pm2 restart umbrel-api                                   │
│                                                             │
│  POSTGRESQL:                                                │
│  • sudo systemctl status postgresql                         │
│  • sudo systemctl start postgresql                          │
│  • sudo systemctl enable postgresql  ← IMPORTANT!          │
│                                                             │
│  CLOUDFLARED:                                               │
│  • sudo systemctl status cloudflared                        │
│  • sudo systemctl restart cloudflared                       │
│                                                             │
│  DATABASE:                                                  │
│  • Host: localhost (on Umbrel)                              │
│  • Port: 5432                                               │
│  • Database: aggrandize_business                            │
│  • User: aggrandize                                         │
│                                                             │
│  AFTER REBOOT - START ORDER:                                │
│  1. sudo systemctl start postgresql                         │
│  2. pm2 start umbrel-api                                    │
│  3. (cloudflared auto-starts)                               │
│                                                             │
│  KEY FILES:                                                 │
│  • API: /home/umbrel/umbrel-api/                            │
│  • Tunnel: /home/umbrel/.cloudflared/                       │
│  • PostgreSQL: /var/lib/postgresql/15/main/                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Last Updated: December 2024*
*Version: 1.1 - Added PostgreSQL Installation & PM2 docs*
