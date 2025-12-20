# Aggrandize Dashboard - Deployment Scripts

Automation scripts for deploying and managing the Aggrandize Dashboard infrastructure.

## Available Scripts

### 🚀 Umbrel API Deployment

#### `deploy-umbrel-api.sh`
Deploys the Express API server to Umbrel with systemd service setup.

**Usage:**
```bash
./scripts/deploy-umbrel-api.sh
```

**What it does:**
- Tests SSH connection to Umbrel
- Syncs API code via rsync (excludes node_modules, .env, .git)
- Installs production npm dependencies
- Copies and enables systemd services
- Restarts services and shows status

**Prerequisites:**
- SSH access to `umbrel@umbrel.local`
- SSH key-based authentication configured
- Umbrel API directory structure exists locally

**Output:**
- Service status for umbrel-api and cloudflared
- Helpful next steps and monitoring commands

---

### 🌐 Cloudflare Tunnel Setup

#### `setup-cloudflare-tunnel.sh`
Interactive script to configure Cloudflare Tunnel on Umbrel for secure external API access.

**Usage:**
```bash
./scripts/setup-cloudflare-tunnel.sh
```

**What it does:**
- Verifies cloudflared installation on Umbrel
- Prompts for Tunnel ID from Cloudflare dashboard
- Accepts tunnel credentials JSON
- Creates `.cloudflared` directory structure
- Uploads credentials and generates config.yml
- Tests tunnel connectivity
- Creates and enables cloudflared systemd service
- Provides DNS configuration instructions

**Prerequisites:**
- cloudflared installed on Umbrel (`/usr/local/bin/cloudflared`)
- Cloudflare account with Zero Trust access
- Tunnel created in Cloudflare dashboard

**Interactive Prompts:**
1. Tunnel ID (UUID format)
2. Credentials JSON (multi-line paste)

**Output:**
- Tunnel configuration summary
- Connection test results
- DNS setup instructions

---

### 📦 Inventory Import

#### `import-inventory.js`
Imports product inventory from Excel files into Supabase database.

**Usage:**
```bash
node scripts/import-inventory.js
```

**What it does:**
- Reads Excel files from configured path
- Parses product data and images
- Uploads to Supabase inventory table

---

## Quick Start Guide

### First Time Setup

1. **Deploy API to Umbrel:**
   ```bash
   chmod +x scripts/deploy-umbrel-api.sh
   ./scripts/deploy-umbrel-api.sh
   ```

2. **Setup Cloudflare Tunnel:**
   ```bash
   chmod +x scripts/setup-cloudflare-tunnel.sh
   ./scripts/setup-cloudflare-tunnel.sh
   ```

3. **Configure DNS:**
   Follow instructions in `/docs/UMBREL-CLOUDFLARE-SETUP.md`

4. **Test Connection:**
   ```bash
   curl https://api.aggrandizedigital.com/health
   ```

### Subsequent Deployments

After making code changes to the API:

```bash
./scripts/deploy-umbrel-api.sh
```

This automatically:
- Syncs new code
- Installs new dependencies
- Restarts services
- Shows deployment status

---

## Troubleshooting

### "Cannot connect to umbrel@umbrel.local"
- Ensure Umbrel is powered on and on the same network
- Test: `ping umbrel.local`
- Try IP address: `ssh umbrel@192.168.x.x`

### "cloudflared not found"
Install cloudflared on Umbrel:
```bash
ssh umbrel@umbrel.local
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared
```

### Services not starting
Check logs:
```bash
ssh umbrel@umbrel.local 'sudo journalctl -u umbrel-api -n 50'
ssh umbrel@umbrel.local 'sudo journalctl -u cloudflared -n 50'
```

---

## Documentation

For comprehensive setup instructions, see:
- **[/docs/UMBREL-CLOUDFLARE-SETUP.md](/docs/UMBREL-CLOUDFLARE-SETUP.md)** - Complete deployment guide

---

## Script Features

### Error Handling
- `set -e` exits on any error
- SSH connection tests before operations
- Service status verification after deployment

### Progress Indicators
- Color-coded output (green=success, yellow=info, red=error)
- Step numbering ([1/6], [2/6], etc.)
- Helpful next steps after completion

### Safety
- No automatic service restarts without verification
- Excludes sensitive files (.env, credentials) from sync
- Production-only npm dependencies

---

**Last Updated:** 2024-01-15
**Maintained By:** Aggrandize Digital Team
