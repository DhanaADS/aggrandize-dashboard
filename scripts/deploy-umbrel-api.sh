#!/bin/bash

# Umbrel API Deployment Script
# Deploys the Express API server to Umbrel and sets up systemd services
# Usage: ./scripts/deploy-umbrel-api.sh

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
UMBREL_HOST="umbrel@umbrel.local"
REMOTE_PATH="/home/umbrel/umbrel-api"
LOCAL_PATH="./umbrel-api"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Aggrandize Dashboard - Umbrel API Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if umbrel-api directory exists
if [ ! -d "$LOCAL_PATH" ]; then
    echo -e "${RED}Error: $LOCAL_PATH directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Test SSH connection
echo -e "${YELLOW}[1/6] Testing SSH connection to Umbrel...${NC}"
if ! ssh -o ConnectTimeout=5 "$UMBREL_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to $UMBREL_HOST${NC}"
    echo "Please ensure:"
    echo "  1. Umbrel is running and accessible on the network"
    echo "  2. SSH is enabled on Umbrel"
    echo "  3. You have SSH key-based authentication set up"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"
echo ""

# Create remote directory if it doesn't exist
echo -e "${YELLOW}[2/6] Creating remote directory...${NC}"
ssh "$UMBREL_HOST" "mkdir -p $REMOTE_PATH"
echo -e "${GREEN}✓ Remote directory ready: $REMOTE_PATH${NC}"
echo ""

# Sync files to Umbrel
echo -e "${YELLOW}[3/6] Syncing files to Umbrel...${NC}"
echo "Copying files via rsync..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '.git' \
    --exclude '*.log' \
    "$LOCAL_PATH/" "$UMBREL_HOST:$REMOTE_PATH/"

echo -e "${GREEN}✓ Files synchronized successfully${NC}"
echo ""

# Install npm dependencies on remote
echo -e "${YELLOW}[4/6] Installing npm dependencies on Umbrel...${NC}"
ssh "$UMBREL_HOST" << 'ENDSSH'
cd /home/umbrel/umbrel-api
echo "Installing production dependencies..."
npm install --production
echo "Dependencies installed successfully"
ENDSSH
echo -e "${GREEN}✓ NPM dependencies installed${NC}"
echo ""

# Setup systemd services
echo -e "${YELLOW}[5/6] Setting up systemd services...${NC}"

# Copy and enable umbrel-api service
echo "Installing umbrel-api.service..."
ssh "$UMBREL_HOST" << 'ENDSSH'
sudo cp /home/umbrel/umbrel-api/umbrel-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable umbrel-api.service
echo "umbrel-api.service installed and enabled"
ENDSSH

# Check if cloudflared service exists and install if needed
echo "Checking cloudflared service..."
ssh "$UMBREL_HOST" << 'ENDSSH'
if [ ! -f /etc/systemd/system/cloudflared.service ]; then
    echo "Creating cloudflared.service..."
    sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=umbrel
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/umbrel/.cloudflared/config.yml run
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cloudflared

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable cloudflared.service
    echo "cloudflared.service created and enabled"
else
    echo "cloudflared.service already exists"
fi
ENDSSH

echo -e "${GREEN}✓ Systemd services configured${NC}"
echo ""

# Restart services
echo -e "${YELLOW}[6/6] Restarting services...${NC}"
ssh "$UMBREL_HOST" << 'ENDSSH'
echo "Restarting umbrel-api..."
sudo systemctl restart umbrel-api.service
sleep 2

echo "Checking umbrel-api status..."
if sudo systemctl is-active --quiet umbrel-api.service; then
    echo "✓ umbrel-api is running"
else
    echo "⚠ Warning: umbrel-api failed to start"
    echo "Check logs with: sudo journalctl -u umbrel-api -n 50"
fi

# Only restart cloudflared if it's configured
if [ -f /home/umbrel/.cloudflared/config.yml ] && ! grep -q "YOUR_TUNNEL_ID" /home/umbrel/.cloudflared/config.yml 2>/dev/null; then
    echo "Restarting cloudflared..."
    sudo systemctl restart cloudflared.service
    sleep 2

    if sudo systemctl is-active --quiet cloudflared.service; then
        echo "✓ cloudflared is running"
    else
        echo "⚠ Warning: cloudflared failed to start"
        echo "Check logs with: sudo journalctl -u cloudflared -n 50"
    fi
else
    echo "⚠ Cloudflared not configured yet (run setup-cloudflare-tunnel.sh)"
fi
ENDSSH

echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Deployment summary
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}         Deployment Completed Successfully!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Service Status:"
ssh "$UMBREL_HOST" << 'ENDSSH'
echo "┌─────────────────────────────────────────────┐"
echo "│ umbrel-api Service                          │"
echo "└─────────────────────────────────────────────┘"
sudo systemctl status umbrel-api.service --no-pager -l | head -n 15

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│ cloudflared Service                         │"
echo "└─────────────────────────────────────────────┘"
if systemctl is-enabled --quiet cloudflared.service 2>/dev/null; then
    sudo systemctl status cloudflared.service --no-pager -l | head -n 15
else
    echo "Not configured yet - run setup-cloudflare-tunnel.sh"
fi
ENDSSH

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. If you haven't set up Cloudflare Tunnel yet, run:"
echo -e "     ${BLUE}./scripts/setup-cloudflare-tunnel.sh${NC}"
echo ""
echo "  2. View API logs:"
echo -e "     ${BLUE}ssh $UMBREL_HOST 'sudo journalctl -u umbrel-api -f'${NC}"
echo ""
echo "  3. View tunnel logs:"
echo -e "     ${BLUE}ssh $UMBREL_HOST 'sudo journalctl -u cloudflared -f'${NC}"
echo ""
echo "  4. Test API health endpoint (after tunnel setup):"
echo -e "     ${BLUE}curl https://api.aggrandizedigital.com/health${NC}"
echo ""
