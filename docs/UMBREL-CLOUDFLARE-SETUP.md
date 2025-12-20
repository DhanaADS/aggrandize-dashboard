# Umbrel + Cloudflare Tunnel Setup Guide

Complete guide for deploying the Aggrandize Dashboard API on Umbrel with Cloudflare Tunnel for secure external access.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Cloudflare Account Setup](#cloudflare-account-setup)
5. [Creating a Cloudflare Tunnel](#creating-a-cloudflare-tunnel)
6. [Installing cloudflared on Umbrel](#installing-cloudflared-on-umbrel)
7. [Deploying the API](#deploying-the-api)
8. [DNS Configuration](#dns-configuration)
9. [Testing the Connection](#testing-the-connection)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This setup allows you to:
- Run the Aggrandize Dashboard API on your Umbrel server at home
- Access it securely from anywhere via `api.aggrandizedigital.com`
- Avoid port forwarding and expose no local IP addresses
- Use Cloudflare's global network for DDoS protection and caching

**How it works:**
```
Next.js Dashboard (Vercel)
         ↓
    HTTPS Request
         ↓
Cloudflare Edge Network
         ↓
   Cloudflare Tunnel (encrypted)
         ↓
Umbrel Server (local network)
         ↓
  Express API (port 3333)
         ↓
PostgreSQL Database (local)
```

---

## Prerequisites

### Required Accounts
- [x] Cloudflare account (free tier works)
- [x] GoDaddy account with `aggrandizedigital.com` domain
- [x] Access to Umbrel server on local network

### Required Software
- [x] Umbrel server running and accessible
- [x] SSH access to Umbrel (`ssh umbrel@umbrel.local`)
- [x] Node.js installed on Umbrel (v18 or higher)
- [x] PostgreSQL running on Umbrel with Supabase data

### On Your Development Machine
- [x] Git repository cloned
- [x] SSH key configured for Umbrel access
- [x] rsync installed (for deployment script)

### Network Requirements
- Umbrel must have internet access
- No port forwarding needed
- No static IP required

---

## Architecture

### Components

**1. Umbrel API Server**
- Location: `/home/umbrel/umbrel-api/`
- Port: `3333` (local only)
- Stack: Express.js + Node.js + PostgreSQL
- Service: `umbrel-api.service` (systemd)

**2. Cloudflare Tunnel (cloudflared)**
- Location: `/home/umbrel/.cloudflared/`
- Binary: `/usr/local/bin/cloudflared`
- Config: `/home/umbrel/.cloudflared/config.yml`
- Service: `cloudflared.service` (systemd)

**3. PostgreSQL Database**
- Port: `5432` (local only)
- Connection: Via Umbrel's PostgreSQL container

### Security Model
- API never directly exposed to internet
- All traffic encrypted via Cloudflare Tunnel
- Cloudflare handles SSL/TLS certificates
- API key authentication required for requests
- Rate limiting and CORS protection enabled

---

## Cloudflare Account Setup

### Step 1: Sign Up / Log In
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sign up for a free account (if needed)
3. Verify your email address

### Step 2: Access Zero Trust Dashboard
1. Navigate to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. If first time, set up your team name
3. Choose the **Free** plan (sufficient for this setup)

**Expected Screen:**
```
┌─────────────────────────────────────────┐
│ Cloudflare Zero Trust Dashboard         │
├─────────────────────────────────────────┤
│ > Networks                               │
│   - Tunnels                             │
│   - Routes                              │
│ > Access                                 │
│ > Gateway                                │
└─────────────────────────────────────────┘
```

### Step 3: Verify Team Name
- Your Zero Trust team URL: `https://<your-team>.cloudflareaccess.com`
- Remember this for future access

---

## Creating a Cloudflare Tunnel

### Step 1: Navigate to Tunnels
1. In Zero Trust Dashboard, click **Networks** → **Tunnels**
2. Click **Create a tunnel** button

### Step 2: Choose Connector Type
- Select **Cloudflared** (not Quick Tunnels)
- Click **Next**

### Step 3: Name Your Tunnel
- Tunnel Name: `aggrandize-umbrel` (or your preference)
- Click **Save tunnel**

### Step 4: Copy Tunnel Information
After creation, you'll see:

```
Tunnel ID: 12345678-abcd-1234-efgh-123456789abc
Status: INACTIVE (will activate after installation)
```

**IMPORTANT:** Copy and save:
- ✅ Tunnel ID (UUID format)
- ✅ Tunnel token (if shown)

### Step 5: Get Credentials
You'll see installation instructions. Look for the credentials JSON or download option.

**Example credentials file content:**
```json
{
  "AccountTag": "abc123...",
  "TunnelSecret": "def456...",
  "TunnelID": "12345678-abcd-1234-efgh-123456789abc"
}
```

**Save this JSON** - you'll need it for the setup script.

---

## Installing cloudflared on Umbrel

### Option A: Using Setup Script (Recommended)
If cloudflared is already installed, skip to [Deploying the API](#deploying-the-api).

### Option B: Manual Installation
If not installed, SSH into Umbrel and install:

```bash
# SSH into Umbrel
ssh umbrel@umbrel.local

# Download cloudflared (ARM64 for Raspberry Pi)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

# Move to system binary location
sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

**Expected Output:**
```
cloudflared version 2024.x.x (built 20xx-xx-xx-xxxx UTC)
```

---

## Deploying the API

### Step 1: Prepare Environment Variables
On Umbrel, create `/home/umbrel/umbrel-api/.env`:

```bash
# SSH into Umbrel
ssh umbrel@umbrel.local

# Navigate to API directory (will be created by deploy script)
cd /home/umbrel/umbrel-api

# Create .env file
nano .env
```

Add the following:
```env
# Server Configuration
PORT=3333
NODE_ENV=production

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=postgres

# API Security
API_KEY=your_secure_api_key_here

# CORS
ALLOWED_ORIGINS=https://aggrandize-dashboard.vercel.app,http://localhost:3000
```

**Important:** Replace `your_postgres_password` and `your_secure_api_key_here` with actual values.

Save and exit (`Ctrl+X`, `Y`, `Enter`).

### Step 2: Run Deployment Script
From your development machine (project root):

```bash
# Make script executable
chmod +x scripts/deploy-umbrel-api.sh

# Run deployment
./scripts/deploy-umbrel-api.sh
```

**Expected Output:**
```
================================================
  Aggrandize Dashboard - Umbrel API Deployment
================================================

[1/6] Testing SSH connection to Umbrel...
✓ SSH connection successful

[2/6] Creating remote directory...
✓ Remote directory ready: /home/umbrel/umbrel-api

[3/6] Syncing files to Umbrel...
Copying files via rsync...
sending incremental file list
src/server.js
src/db.js
...
✓ Files synchronized successfully

[4/6] Installing npm dependencies on Umbrel...
Installing production dependencies...
✓ NPM dependencies installed

[5/6] Setting up systemd services...
Installing umbrel-api.service...
✓ Systemd services configured

[6/6] Restarting services...
✓ umbrel-api is running
⚠ Cloudflared not configured yet (run setup-cloudflare-tunnel.sh)

================================================
         Deployment Completed Successfully!
================================================
```

### Step 3: Verify API is Running
```bash
# Check service status
ssh umbrel@umbrel.local 'sudo systemctl status umbrel-api'

# Expected output:
# ● umbrel-api.service - Umbrel API Server for Aggrandize Dashboard
#    Loaded: loaded (/etc/systemd/system/umbrel-api.service; enabled)
#    Active: active (running) since ...

# Test local API
ssh umbrel@umbrel.local 'curl http://localhost:3333/health'

# Expected output:
# {"status":"ok","message":"Umbrel API is running","timestamp":"2024-01-15T10:30:00.000Z"}
```

---

## Configuring Cloudflare Tunnel

### Step 1: Run Setup Script
From your development machine:

```bash
# Make script executable
chmod +x scripts/setup-cloudflare-tunnel.sh

# Run setup
./scripts/setup-cloudflare-tunnel.sh
```

### Step 2: Interactive Setup
The script will prompt you for:

**Prompt 1: Tunnel ID**
```
Enter your Cloudflare Tunnel ID: 12345678-abcd-1234-efgh-123456789abc
```
Paste the Tunnel ID you copied from Cloudflare dashboard.

**Prompt 2: Credentials JSON**
```
Paste the entire JSON credentials (ends with }), then press Enter twice:

{
  "AccountTag": "abc123...",
  "TunnelSecret": "def456...",
  "TunnelID": "12345678-abcd-1234-efgh-123456789abc"
}
[Press Enter twice here]
```

### Step 3: Verify Setup
**Expected Output:**
```
✓ Valid tunnel ID received
✓ Valid credentials JSON received
✓ Created directory: /home/umbrel/.cloudflared
✓ Credentials file uploaded: 12345678-abcd-1234-efgh-123456789abc.json
✓ Configuration file created: config.yml

Generated Configuration:
────────────────────────────────────────
tunnel: 12345678-abcd-1234-efgh-123456789abc
credentials-file: /home/umbrel/.cloudflared/12345678-abcd-1234-efgh-123456789abc.json

ingress:
  - hostname: api.aggrandizedigital.com
    service: http://localhost:3333
    originRequest:
      noTLSVerify: false
  - service: http_status:404
────────────────────────────────────────

✓ Tunnel connection successful!
✓ Systemd service configured and started
✓ cloudflared service is running!
```

### Step 4: Check Tunnel Status
```bash
# View service status
ssh umbrel@umbrel.local 'sudo systemctl status cloudflared'

# View live logs
ssh umbrel@umbrel.local 'sudo journalctl -u cloudflared -f'
```

**Healthy logs look like:**
```
Jan 15 10:30:00 cloudflared[1234]: Connection registered connIndex=0
Jan 15 10:30:00 cloudflared[1234]: Connection registered connIndex=1
Jan 15 10:30:00 cloudflared[1234]: Connection registered connIndex=2
Jan 15 10:30:00 cloudflared[1234]: Connection registered connIndex=3
```

---

## DNS Configuration

You need to configure DNS to route `api.aggrandizedigital.com` through the tunnel.

### Option A: Cloudflare Zero Trust (Recommended)

**Step 1:** Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)

**Step 2:** Navigate to **Networks** → **Tunnels** → **[Your Tunnel]**

**Step 3:** Click **Public Hostname** tab

**Step 4:** Click **Add a public hostname**

**Step 5:** Fill in the form:
```
┌─────────────────────────────────────────┐
│ Add public hostname                      │
├─────────────────────────────────────────┤
│ Subdomain:   api                        │
│ Domain:      aggrandizedigital.com      │
│ Path:        (leave empty)              │
│                                          │
│ Service:                                 │
│ Type:        HTTP                        │
│ URL:         localhost:3333             │
│                                          │
│ [Save hostname]                         │
└─────────────────────────────────────────┘
```

**Step 6:** Click **Save hostname**

### Option B: Cloudflare DNS (Alternative)

**Step 1:** Transfer domain to Cloudflare (if not already)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Add site**
3. Enter `aggrandizedigital.com`
4. Follow nameserver change instructions

**Step 2:** Add DNS record
1. Navigate to DNS settings for `aggrandizedigital.com`
2. Click **Add record**
3. Configure:
   - **Type:** CNAME
   - **Name:** api
   - **Target:** `12345678-abcd-1234-efgh-123456789abc.cfargotunnel.com`
   - **Proxy status:** Proxied (orange cloud ☁️)
   - **TTL:** Auto

**Step 3:** Save the record

### Verification
DNS propagation takes 1-5 minutes. Check with:

```bash
# Check DNS resolution
nslookup api.aggrandizedigital.com

# Expected output:
# Non-authoritative answer:
# Name: api.aggrandizedigital.com
# Address: [Cloudflare IP]

# Or use dig
dig api.aggrandizedigital.com +short
```

---

## Testing the Connection

### Test 1: Health Endpoint
```bash
curl https://api.aggrandizedigital.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Umbrel API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test 2: Database Connection
```bash
curl https://api.aggrandizedigital.com/api/expenses \
  -H "x-api-key: your_api_key_here"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

### Test 3: From Next.js Dashboard
Update `/src/lib/umbrel/api.ts` with:

```typescript
const UMBREL_API_URL = 'https://api.aggrandizedigital.com';
const UMBREL_API_KEY = process.env.NEXT_PUBLIC_UMBREL_API_KEY;
```

Then test from your dashboard UI.

### Common Response Issues

**403 Forbidden:**
```json
{"error": "Forbidden"}
```
→ Missing or invalid API key in headers

**502 Bad Gateway:**
```json
{"error": "Bad Gateway"}
```
→ API service not running on Umbrel or tunnel disconnected

**404 Not Found:**
```json
{"error": "Not Found"}
```
→ DNS not configured or endpoint doesn't exist

---

## Monitoring and Maintenance

### Service Status Commands
```bash
# SSH into Umbrel
ssh umbrel@umbrel.local

# Check all services
sudo systemctl status umbrel-api
sudo systemctl status cloudflared
sudo systemctl status postgresql

# Restart services if needed
sudo systemctl restart umbrel-api
sudo systemctl restart cloudflared
```

### Viewing Logs

**API Logs:**
```bash
# Real-time logs
sudo journalctl -u umbrel-api -f

# Last 100 lines
sudo journalctl -u umbrel-api -n 100

# Logs from last hour
sudo journalctl -u umbrel-api --since "1 hour ago"
```

**Tunnel Logs:**
```bash
# Real-time logs
sudo journalctl -u cloudflared -f

# Last 50 lines
sudo journalctl -u cloudflared -n 50
```

**PostgreSQL Logs:**
```bash
# Umbrel PostgreSQL logs
docker logs umbrel_postgres -f
```

### Automatic Restarts
Both services are configured to restart automatically on failure:
- `Restart=on-failure`
- `RestartSec=10` (wait 10 seconds before restart)

### Redeploying After Code Changes
```bash
# From your development machine
./scripts/deploy-umbrel-api.sh
```

This will:
1. Sync new code to Umbrel
2. Install any new dependencies
3. Restart the API service
4. Keep tunnel running (no interruption)

### Updating cloudflared
```bash
# SSH into Umbrel
ssh umbrel@umbrel.local

# Download latest version
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O cloudflared-new

# Replace binary
sudo mv cloudflared-new /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Restart service
sudo systemctl restart cloudflared

# Verify version
cloudflared --version
```

---

## Troubleshooting

### Issue 1: "Cannot connect to umbrel@umbrel.local"

**Symptoms:**
```
Error: Cannot connect to umbrel@umbrel.local
```

**Solutions:**
1. Check Umbrel is powered on and connected to network
2. Verify you're on the same local network
3. Try IP address instead: `ssh umbrel@192.168.x.x`
4. Check SSH is enabled in Umbrel settings

**Test:**
```bash
ping umbrel.local
```

---

### Issue 2: API Service Won't Start

**Symptoms:**
```
⚠ Warning: umbrel-api failed to start
```

**Diagnosis:**
```bash
# Check detailed error
ssh umbrel@umbrel.local 'sudo journalctl -u umbrel-api -n 50'

# Common errors:
# - "Cannot find module 'express'" → npm install failed
# - "ECONNREFUSED PostgreSQL" → Database not running
# - "Port 3333 already in use" → Another process using port
```

**Solutions:**

**Missing Dependencies:**
```bash
ssh umbrel@umbrel.local
cd /home/umbrel/umbrel-api
npm install --production
sudo systemctl restart umbrel-api
```

**Database Connection:**
```bash
# Check PostgreSQL is running
ssh umbrel@umbrel.local 'docker ps | grep postgres'

# Check .env file exists with correct credentials
ssh umbrel@umbrel.local 'cat /home/umbrel/umbrel-api/.env'
```

**Port Conflict:**
```bash
# Find what's using port 3333
ssh umbrel@umbrel.local 'sudo lsof -i :3333'

# Kill conflicting process
ssh umbrel@umbrel.local 'sudo kill -9 [PID]'
```

---

### Issue 3: Cloudflare Tunnel Not Connecting

**Symptoms:**
```
cloudflared service is running but no connections registered
```

**Diagnosis:**
```bash
# Check tunnel logs for errors
ssh umbrel@umbrel.local 'sudo journalctl -u cloudflared -n 100'

# Common errors:
# - "Invalid tunnel credentials" → Wrong credentials file
# - "Tunnel not found" → Tunnel ID mismatch
# - "Failed to dial edge" → Network connectivity issue
```

**Solutions:**

**Invalid Credentials:**
```bash
# Re-run setup script
./scripts/setup-cloudflare-tunnel.sh

# Or manually check credentials file
ssh umbrel@umbrel.local 'cat /home/umbrel/.cloudflared/*.json'
```

**Tunnel ID Mismatch:**
```bash
# Verify tunnel ID in config matches Cloudflare dashboard
ssh umbrel@umbrel.local 'cat /home/umbrel/.cloudflared/config.yml'

# Compare with Cloudflare dashboard tunnel list
```

**Network Connectivity:**
```bash
# Test internet connectivity from Umbrel
ssh umbrel@umbrel.local 'ping -c 4 cloudflare.com'

# Test HTTPS
ssh umbrel@umbrel.local 'curl -I https://cloudflare.com'
```

---

### Issue 4: DNS Not Resolving

**Symptoms:**
```bash
curl https://api.aggrandizedigital.com
# curl: (6) Could not resolve host: api.aggrandizedigital.com
```

**Solutions:**

1. **Wait for DNS propagation** (1-5 minutes after adding record)

2. **Check DNS record exists:**
   - Go to Cloudflare Dashboard → DNS
   - Verify CNAME record for `api` exists

3. **Check DNS from different location:**
```bash
# Use Google DNS
nslookup api.aggrandizedigital.com 8.8.8.8

# Use Cloudflare DNS
nslookup api.aggrandizedigital.com 1.1.1.1
```

4. **Flush local DNS cache:**
```bash
# macOS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Linux
sudo systemd-resolve --flush-caches

# Windows
ipconfig /flushdns
```

---

### Issue 5: "502 Bad Gateway" Error

**Symptoms:**
```bash
curl https://api.aggrandizedigital.com/health
# 502 Bad Gateway
```

**Diagnosis:**
This means Cloudflare tunnel is connected, but cannot reach the API.

**Solutions:**

1. **Check API service is running:**
```bash
ssh umbrel@umbrel.local 'sudo systemctl status umbrel-api'
```

2. **Test API locally on Umbrel:**
```bash
ssh umbrel@umbrel.local 'curl http://localhost:3333/health'
```

3. **Check tunnel ingress configuration:**
```bash
ssh umbrel@umbrel.local 'cat /home/umbrel/.cloudflared/config.yml'

# Verify:
# - service: http://localhost:3333 (correct port)
# - hostname: api.aggrandizedigital.com (correct domain)
```

4. **Restart both services:**
```bash
ssh umbrel@umbrel.local << 'EOF'
sudo systemctl restart umbrel-api
sleep 3
sudo systemctl restart cloudflared
EOF
```

---

### Issue 6: "403 Forbidden" on API Requests

**Symptoms:**
```bash
curl https://api.aggrandizedigital.com/api/expenses
# {"error":"Forbidden"}
```

**Solution:**
Include API key in request headers:

```bash
curl https://api.aggrandizedigital.com/api/expenses \
  -H "x-api-key: your_api_key_here"
```

**Check API key is set:**
```bash
ssh umbrel@umbrel.local 'grep API_KEY /home/umbrel/umbrel-api/.env'
```

---

### Issue 7: Umbrel Rebooted, Services Not Running

**After Umbrel restart, check service status:**

```bash
# Check if services are enabled (auto-start)
ssh umbrel@umbrel.local << 'EOF'
sudo systemctl is-enabled umbrel-api
sudo systemctl is-enabled cloudflared

# Both should return: enabled
EOF
```

**If not enabled:**
```bash
ssh umbrel@umbrel.local << 'EOF'
sudo systemctl enable umbrel-api
sudo systemctl enable cloudflared
sudo systemctl start umbrel-api
sudo systemctl start cloudflared
EOF
```

---

### Issue 8: High Latency / Slow Responses

**Diagnosis:**
```bash
# Test latency to API
time curl https://api.aggrandizedigital.com/health

# Should be < 500ms typically
```

**Possible Causes:**
1. Slow internet connection on Umbrel
2. Database query performance issues
3. Cloudflare routing (rare)

**Solutions:**

**Test Database Performance:**
```bash
ssh umbrel@umbrel.local
psql -U postgres -d postgres -c "EXPLAIN ANALYZE SELECT * FROM expenses LIMIT 10;"
```

**Check Umbrel Internet Speed:**
```bash
ssh umbrel@umbrel.local 'curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -'
```

**Add Database Indexes** (if queries are slow):
See `/supabase-schema.sql` for index definitions.

---

## Advanced Configuration

### Custom Port for API
If port 3333 is already in use, change it:

1. **Update `.env` on Umbrel:**
```bash
PORT=3334  # or any available port
```

2. **Update tunnel config:**
```bash
ssh umbrel@umbrel.local
nano /home/umbrel/.cloudflared/config.yml

# Change:
service: http://localhost:3334
```

3. **Restart services:**
```bash
sudo systemctl restart umbrel-api
sudo systemctl restart cloudflared
```

### Multiple Subdomains
To expose multiple services through the same tunnel:

```yaml
# /home/umbrel/.cloudflared/config.yml
tunnel: 12345678-abcd-1234-efgh-123456789abc
credentials-file: /home/umbrel/.cloudflared/12345678-abcd-1234-efgh-123456789abc.json

ingress:
  # API endpoint
  - hostname: api.aggrandizedigital.com
    service: http://localhost:3333

  # Admin dashboard (example)
  - hostname: admin.aggrandizedigital.com
    service: http://localhost:3334

  # Catch-all
  - service: http_status:404
```

Then add corresponding DNS records for each subdomain.

### Enable HTTP/2
Cloudflare automatically uses HTTP/2 for connections, no configuration needed on your side.

### Rate Limiting (Already Configured)
The API includes rate limiting via `express-rate-limit`:
- 100 requests per 15 minutes per IP
- Configured in `/umbrel-api/src/server.js`

### HTTPS Redirect
Cloudflare automatically redirects HTTP → HTTPS. No configuration needed.

---

## Security Best Practices

### 1. Protect API Keys
```bash
# Never commit .env to Git
echo ".env" >> .gitignore

# Use strong API keys (32+ characters)
openssl rand -base64 32
```

### 2. Keep Software Updated
```bash
# Update cloudflared regularly
# Update Node.js and npm packages
ssh umbrel@umbrel.local 'cd /home/umbrel/umbrel-api && npm update'
```

### 3. Monitor Access Logs
```bash
# Check for suspicious activity
ssh umbrel@umbrel.local 'sudo journalctl -u umbrel-api | grep -i "error\|unauthorized"'
```

### 4. Backup Database Regularly
```bash
# Automated backup script (add to cron)
ssh umbrel@umbrel.local << 'EOF'
pg_dump -U postgres postgres > /home/umbrel/backups/postgres-$(date +%Y%m%d).sql
EOF
```

### 5. Firewall Configuration
Umbrel's firewall should block external access to ports. Verify:
```bash
ssh umbrel@umbrel.local 'sudo ufw status'
```

Only Cloudflare tunnel should connect out (no incoming ports needed).

---

## Quick Reference

### Deployment Commands
```bash
# Deploy API to Umbrel
./scripts/deploy-umbrel-api.sh

# Setup Cloudflare Tunnel
./scripts/setup-cloudflare-tunnel.sh
```

### Service Management
```bash
# Status
ssh umbrel@umbrel.local 'sudo systemctl status umbrel-api cloudflared'

# Restart
ssh umbrel@umbrel.local 'sudo systemctl restart umbrel-api cloudflared'

# Logs
ssh umbrel@umbrel.local 'sudo journalctl -u umbrel-api -f'
ssh umbrel@umbrel.local 'sudo journalctl -u cloudflared -f'
```

### Testing
```bash
# Health check
curl https://api.aggrandizedigital.com/health

# API request
curl https://api.aggrandizedigital.com/api/expenses \
  -H "x-api-key: YOUR_KEY"
```

### File Locations
```
Umbrel API:      /home/umbrel/umbrel-api/
Cloudflared:     /home/umbrel/.cloudflared/
Systemd:         /etc/systemd/system/
Logs:            journalctl -u [service-name]
```

---

## Support and Resources

### Cloudflare Documentation
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
- [Cloudflare Community](https://community.cloudflare.com/)

### Umbrel Documentation
- [Umbrel Docs](https://umbrel.com/docs)
- [Umbrel Community](https://community.umbrel.com/)

### Project Documentation
- `/umbrel-api/README.md` - API documentation
- `/docs/API.md` - API endpoints reference
- `/CLAUDE.md` - Project architecture

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial setup guide
- Automated deployment scripts
- Cloudflare Tunnel integration
- Systemd service configuration

---

**Last Updated:** 2024-01-15
**Maintained By:** Aggrandize Digital Team
**Contact:** dhana@aggrandizedigital.com
