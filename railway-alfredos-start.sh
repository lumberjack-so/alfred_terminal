#!/bin/sh

# AlfredOS LibreChat Railway Startup Script
echo "🚀 Starting AlfredOS LibreChat..."

# Configuration
CONFIG_DIR="/app/config"
CONFIG_FILE="$CONFIG_DIR/librechat.yaml"
GITHUB_CONFIG_URL="https://raw.githubusercontent.com/lumberjack-so/LibreChat/refs/heads/main/librechat.example.yaml"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# FIRST TIME SETUP: If no config exists, download from GitHub
if [ ! -f "$CONFIG_FILE" ]; then
    echo "🆕 First time setup - downloading base config from GitHub..."
    wget -q -O "$CONFIG_FILE" "$GITHUB_CONFIG_URL"
    
    if [ $? -eq 0 ]; then
        echo "✅ Initial config downloaded successfully"
    else
        echo "❌ Failed to download initial configuration"
        exit 1
    fi
else
    echo "✅ Using existing config with your personal MCP servers"
fi

# Create symlink so Smithery can update at /app/librechat.yaml
ln -sf "$CONFIG_FILE" /app/librechat.yaml

# Set CONFIG_PATH to the persistent file
export CONFIG_PATH="$CONFIG_FILE"

echo "📍 Config locations:"
echo "   - Your persistent config: $CONFIG_FILE"
echo "   - Smithery writes to: /app/librechat.yaml (symlink)"
echo "🔧 Your MCP server configurations will persist across restarts!"

# Run docker-entrypoint which handles package verification and then the original entrypoint
exec /docker-entrypoint.sh /entrypoint.sh npm run backend 