#!/bin/sh

# Inject env vars into env.js from template
envsubst < /app/client/dist/env.template.js > /app/client/dist/env.js

# Show contents for debugging
echo "=== Generated /app/client/dist/env.js ==="
cat /app/client/dist/env.js
echo "========================================="

# Verify that environment variables were properly substituted
if grep -q '\${VITE_' /app/client/dist/env.js; then
    echo "WARNING: Some VITE_ variables were not properly substituted"
    echo "Make sure the following environment variables are set:"
    echo "  - VITE_NOCO_URL"
    echo "  - VITE_N8N_URL" 
    echo "  - VITE_CAL_URL"
    echo "  - VITE_GHOST_URL"
fi

cat /app/client/dist/env.js
# Continue with container CMD
exec "$@" 