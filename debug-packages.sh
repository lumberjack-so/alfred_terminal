#!/bin/sh

# Debug script to check package status
echo "🔍 LibreChat Package Debug Info"
echo "================================"

echo "\n📁 Working directory:"
pwd

echo "\n📦 Package directories:"
echo "Checking /app/packages:"
ls -la /app/packages/ 2>/dev/null || echo "Not found"

echo "\nChecking built packages:"
echo "- data-provider dist:"
ls -la /app/packages/data-provider/dist/ 2>/dev/null || echo "Not built"

echo "\n- data-schemas dist:"
ls -la /app/packages/data-schemas/dist/ 2>/dev/null || echo "Not built"

echo "\n- api dist:"
ls -la /app/packages/api/dist/ 2>/dev/null || echo "Not built"

echo "\n🔗 Node modules packages:"
echo "Checking /app/node_modules/@librechat:"
ls -la /app/node_modules/@librechat/ 2>/dev/null || echo "Not found"

echo "\nChecking specific packages:"
echo "- @librechat/api:"
ls -la /app/node_modules/@librechat/api/dist/index.js 2>/dev/null || echo "Not found"

echo "\n- librechat-data-provider:"
ls -la /app/node_modules/librechat-data-provider/dist/index.js 2>/dev/null || echo "Not found"

echo "\n- @librechat/data-schemas:"
ls -la /app/node_modules/@librechat/data-schemas/dist/index.cjs 2>/dev/null || echo "Not found"

echo "\n📋 Package.json workspaces:"
cat /app/package.json | grep -A5 '"workspaces"' 2>/dev/null || echo "Not found"

echo "\n🔧 Node/NPM versions:"
node --version
npm --version

echo "\n🌍 Environment:"
echo "NODE_ENV=$NODE_ENV"
echo "PWD=$PWD"

echo "\n================================"
echo "End of debug info"