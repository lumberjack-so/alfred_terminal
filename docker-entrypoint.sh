#!/bin/sh

# LibreChat Docker Entrypoint
# This ensures all packages are properly linked in production

echo "🚀 Starting LibreChat Docker Container..."

# Function to verify package exists
verify_package() {
    local package_name=$1
    local dist_file=$2
    
    if [ -f "$dist_file" ]; then
        echo "✅ $package_name verified"
        return 0
    else
        echo "❌ $package_name missing at $dist_file"
        return 1
    fi
}

# Run debug info if DEBUG_PACKAGES is set
if [ "$DEBUG_PACKAGES" = "true" ]; then
    /debug-packages.sh
fi

# Check if we're in development or production
if [ "$NODE_ENV" = "production" ] || [ "$RAILWAY_ENVIRONMENT" = "production" ]; then
    echo "🏭 Running in production mode"
    
    # Verify all required packages
    verify_package "@librechat/api" "/app/node_modules/@librechat/api/dist/index.js"
    API_OK=$?
    
    verify_package "librechat-data-provider" "/app/node_modules/librechat-data-provider/dist/index.js"
    DATA_PROVIDER_OK=$?
    
    verify_package "@librechat/data-schemas" "/app/node_modules/@librechat/data-schemas/dist/index.cjs"
    DATA_SCHEMAS_OK=$?
    
    # If any package is missing, try to fix it
    if [ $API_OK -ne 0 ] || [ $DATA_PROVIDER_OK -ne 0 ] || [ $DATA_SCHEMAS_OK -ne 0 ]; then
        echo "⚠️ Some packages are missing, attempting to fix..."
        
        cd /app
        
        # First, ensure workspaces are installed
        echo "🔗 Installing workspaces..."
        npm install --workspaces --if-present
        
        # If still missing, rebuild
        if [ ! -f "/app/node_modules/@librechat/api/dist/index.js" ]; then
            echo "🔨 Rebuilding packages..."
            
            # Build in correct order
            cd packages/data-provider && npm run build && cd ../..
            cd packages/data-schemas && npm run build && cd ../..
            cd packages/api && npm run build && cd ../..
            
            # Re-install to ensure proper linking
            npm install --workspaces --if-present
        fi
        
        # Final verification
        verify_package "@librechat/api" "/app/node_modules/@librechat/api/dist/index.js"
        if [ $? -ne 0 ]; then
            echo "❌ Failed to fix missing packages"
            echo "📁 Checking package directories:"
            ls -la /app/packages/api/dist/ 2>/dev/null || echo "api/dist not found"
            ls -la /app/node_modules/@librechat/ 2>/dev/null || echo "@librechat not found in node_modules"
            exit 1
        fi
    fi
fi

# Inject env vars into client
if [ -f "/app/client/dist/env.template.js" ]; then
    envsubst < /app/client/dist/env.template.js > /app/client/dist/env.js
    echo "✅ Client environment configured"
fi

# Execute the command passed to the container
exec "$@"