#!/bin/sh

# Railway Production Start Script for LibreChat
# This ensures all packages are built before starting the server

echo "🚀 Starting LibreChat Production Setup..."

# Configuration
CONFIG_DIR="/app/config"
CONFIG_FILE="$CONFIG_DIR/librechat.yaml"
GITHUB_CONFIG_URL="https://raw.githubusercontent.com/lumberjack-so/LibreChat/refs/heads/main/librechat.example.yaml"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Handle configuration
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

# Create symlink for Smithery
ln -sf "$CONFIG_FILE" /app/librechat.yaml

# Set CONFIG_PATH to the persistent file
export CONFIG_PATH="$CONFIG_FILE"

echo "📍 Config setup complete"

# Check if packages are built
if [ ! -f "/app/packages/api/dist/index.js" ] || \
   [ ! -f "/app/packages/data-provider/dist/index.js" ] || \
   [ ! -f "/app/packages/data-schemas/dist/index.cjs" ]; then
    echo "📦 Packages not built, running build process..."
    
    # Run the build script
    sh /app/railway-build.sh
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed"
        exit 1
    fi
else
    echo "✅ Packages already built"
fi

# Verify critical files exist
if [ ! -f "/app/node_modules/@librechat/api/dist/index.js" ]; then
    echo "⚠️ Warning: @librechat/api not found in node_modules, checking workspace..."
    
    # Create the directory structure if it doesn't exist
    mkdir -p /app/node_modules/@librechat/api/dist
    
    # Copy built files from packages to node_modules
    if [ -f "/app/packages/api/dist/index.js" ]; then
        echo "📋 Copying api package to node_modules..."
        cp -r /app/packages/api/dist/* /app/node_modules/@librechat/api/dist/
        cp -r /app/packages/api/package.json /app/node_modules/@librechat/api/
    fi
fi

echo "🔍 Final verification..."
if [ -f "/app/node_modules/@librechat/api/dist/index.js" ]; then
    echo "✅ API package verified in node_modules"
else
    echo "❌ API package still missing after setup"
    ls -la /app/node_modules/@librechat/api/ 2>/dev/null || echo "Directory doesn't exist"
    exit 1
fi

# Run the original entrypoint with backend
echo "🚀 Starting LibreChat backend..."
exec /entrypoint.sh npm run backend