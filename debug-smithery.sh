#!/bin/sh

echo "🔍 Debugging Smithery behavior..."

echo -e "\n📁 Current file structure:"
ls -la /app/ | grep -E "(librechat|yaml)"
ls -la /app/config/ 2>/dev/null | grep -E "(librechat|yaml)"

echo -e "\n🔗 Checking symlinks:"
ls -la /app/librechat.yaml

echo -e "\n📄 Current config locations:"
find /app -name "librechat.yaml" -type f 2>/dev/null
find /app -name "*.yaml" -type f 2>/dev/null | head -20

echo -e "\n🏷️ File checksums BEFORE Smithery:"
if [ -f /app/librechat.yaml ]; then
    md5sum /app/librechat.yaml
fi
if [ -f /app/config/librechat.yaml ]; then
    md5sum /app/config/librechat.yaml
fi

echo -e "\n🚀 Running Smithery command..."
echo "Command: npx -y @smithery/cli@latest install @guinness77/n8n-mcp-server --client librechat"

# Watch for file changes
echo -e "\n👀 Watching for file changes..."
inotifywait -m -r /app --format '%w%f %e' -e create,modify,moved_to 2>/dev/null &
WATCH_PID=$!

# Run Smithery
npx -y @smithery/cli@latest install @guinness77/n8n-mcp-server --client librechat --profile millions-knife-i7bhEV --key YOUR_KEY

# Kill the watcher
kill $WATCH_PID 2>/dev/null

echo -e "\n🏷️ File checksums AFTER Smithery:"
if [ -f /app/librechat.yaml ]; then
    md5sum /app/librechat.yaml
fi
if [ -f /app/config/librechat.yaml ]; then
    md5sum /app/config/librechat.yaml
fi

echo -e "\n📄 Searching for any new YAML files:"
find /app -name "*.yaml" -type f -mmin -5 2>/dev/null

echo -e "\n🔍 Checking if Smithery created any temp or backup files:"
find /app -name "*librechat*" -type f 2>/dev/null | grep -v node_modules

echo -e "\n📝 Checking MCP servers in config:"
if [ -f /app/librechat.yaml ]; then
    echo "In /app/librechat.yaml:"
    grep -A 20 "mcpServers:" /app/librechat.yaml || echo "No mcpServers section found!"
fi

echo -e "\n🤔 Checking Smithery's home directory:"
ls -la ~/.smithery/ 2>/dev/null || echo "No .smithery directory"

echo -e "\nDone debugging!" 