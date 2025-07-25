#!/bin/sh

# Railway Build Script for LibreChat
# This ensures all packages are built in the correct order

echo "🏗️ Starting LibreChat build process..."

# Exit on any error
set -e

# Navigate to the app directory
cd /app

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
else
    echo "✅ Dependencies already installed"
fi

# Build packages in the correct order
echo "🔨 Building data-provider package..."
cd packages/data-provider
npm run build
cd ../..

echo "🔨 Building data-schemas package..."
cd packages/data-schemas
npm run build
cd ../..

echo "🔨 Building api package..."
cd packages/api
npm run build
cd ../..

echo "🔨 Building client..."
cd client
npm run build
cd ..

echo "✅ Build complete!"

# Verify the build output
if [ -f "/app/packages/api/dist/index.js" ]; then
    echo "✅ API package built successfully"
else
    echo "❌ API package build failed - dist/index.js not found"
    exit 1
fi

if [ -f "/app/packages/data-provider/dist/index.js" ]; then
    echo "✅ Data provider package built successfully"
else
    echo "❌ Data provider package build failed"
    exit 1
fi

if [ -f "/app/packages/data-schemas/dist/index.cjs" ]; then
    echo "✅ Data schemas package built successfully"
else
    echo "❌ Data schemas package build failed"
    exit 1
fi

echo "🎉 All packages built successfully!"