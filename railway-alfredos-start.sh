#!/bin/sh

# AlfredOS LibreChat Railway Startup Script
echo "🚀 Starting AlfredOS LibreChat..."

# Configuration settings
CONFIG_DIR="/app/config"
CONFIG_FILE="$CONFIG_DIR/librechat.yaml"
GITHUB_CONFIG_URL="https://raw.githubusercontent.com/lumberjack-so/LibreChat/refs/heads/main/librechat.example.yaml"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Create symlink for Smithery compatibility
# This allows Smithery to write to /app/librechat.yaml which actually goes to our volume
echo "🔗 Creating config symlink for MCP server installations..."
ln -sf "$CONFIG_FILE" /app/librechat.yaml

# Check if config file exists
if [ -f "$CONFIG_FILE" ]; then
    echo "📋 Found existing config at $CONFIG_FILE"
else
    echo "📥 No config found. Downloading from GitHub..."
    wget -q -O "$CONFIG_FILE" "$GITHUB_CONFIG_URL"
    
    if [ $? -eq 0 ]; then
        echo "✅ Configuration downloaded successfully"
    else
        echo "❌ Failed to download configuration"
        exit 1
    fi
fi

# Set CONFIG_PATH to the actual file location
export CONFIG_PATH="$CONFIG_FILE"
echo "🔧 CONFIG_PATH set to: $CONFIG_PATH"

# Show config location info
echo "📍 Config locations:"
echo "   - Actual config: $CONFIG_FILE"
echo "   - Symlink (for Smithery): /app/librechat.yaml -> $CONFIG_FILE"

# Run the original entrypoint with backend
exec /entrypoint.sh npm run backend 