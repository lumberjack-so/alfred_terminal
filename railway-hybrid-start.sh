#!/bin/sh

# AlfredOS Hybrid Config Startup
echo "🚀 Starting AlfredOS LibreChat with hybrid config..."

GITHUB_CONFIG="https://raw.githubusercontent.com/lumberjack-so/LibreChat/refs/heads/main/librechat.example.yaml"
LOCAL_MCP_FILE="/app/config/mcp-servers.yaml"
MERGED_CONFIG="/app/librechat.yaml"

# Ensure config directory exists
mkdir -p /app/config

# Download fresh config from GitHub
echo "📥 Fetching latest config from GitHub..."
wget -q -O /tmp/github-config.yaml "$GITHUB_CONFIG"

if [ $? -ne 0 ]; then
    echo "❌ Failed to download GitHub config"
    exit 1
fi

# Check if we have local MCP server additions
if [ -f "$LOCAL_MCP_FILE" ]; then
    echo "🔧 Found local MCP server additions, merging..."
    # This is a simplified merge - in reality you'd want a proper YAML merger
    # For now, just append the MCP servers section
    cp /tmp/github-config.yaml "$MERGED_CONFIG"
    echo "" >> "$MERGED_CONFIG"
    cat "$LOCAL_MCP_FILE" >> "$MERGED_CONFIG"
else
    echo "📋 No local MCP servers found, using GitHub config as-is"
    cp /tmp/github-config.yaml "$MERGED_CONFIG"
fi

# Set CONFIG_PATH to the merged file
export CONFIG_PATH="$MERGED_CONFIG"
echo "✅ Config ready at: $CONFIG_PATH"

# Run LibreChat
exec /entrypoint.sh npm run backend 