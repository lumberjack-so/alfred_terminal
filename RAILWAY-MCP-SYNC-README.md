# Railway MCP Sync Function

This Railway function automatically configures MCP (Model Context Protocol) servers for LibreChat using the Smithery CLI and syncs the necessary environment variables to your Railway project.

## What it Does

1. **Installs MCP servers** using Smithery CLI for:
   - n8n workflow automation
   - Ghost CMS
   - Cal.com scheduling
   - Supabase backend

2. **Generates environment variables** that LibreChat needs:
   - `{SERVICE}_MCP_KEY` - The Smithery API key
   - `{SERVICE}_MCP_PROFILE` - The profile name for each service

3. **Updates Railway environment** automatically using Railway's GraphQL API

## Prerequisites

Before running this function, make sure you have:

### Required Environment Variables

```bash
# Railway Configuration
RAILWAY_PROJECT_ID=your-project-id
RAILWAY_ENVIRONMENT_ID=your-environment-id
RAILWAY_TOKEN=your-service-token  # Must have "Manage Variables" permission

# Smithery Configuration
SMITHERY_API_KEY=your-smithery-api-key

# Service-specific Configuration
# For Ghost
GHOST_API_URL=https://your-ghost-site.com
GHOST_STAFF_API_KEY=your-ghost-admin-key

# For Cal.com
CALCOM_API_KEY=your-calcom-api-key

# For Supabase
SUPABASE_ACCESS_TOKEN=your-supabase-access-token
```

### Railway Service Token

1. Go to your Railway project settings
2. Create a new Service Token
3. Make sure it has **"Manage Variables"** permission
4. Copy the token and set it as `RAILWAY_TOKEN`

## How to Deploy

### Option 1: As a Railway Function

1. Create a new Railway service
2. Set it as a "Function" type
3. Upload these files:
   - `railway-mcp-sync.ts`
   - `railway-mcp-sync-package.json` (rename to `package.json`)
4. Set all required environment variables
5. Deploy and run

### Option 2: Run Locally

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run the sync
bun run railway-mcp-sync.ts
```

## What Gets Created

After running successfully, these environment variables will be created in your Railway project:

- `N8N_MCP_KEY` - Smithery key for n8n
- `N8N_MCP_PROFILE` - Profile name for n8n
- `GHOST_MCP_KEY` - Smithery key for Ghost
- `GHOST_MCP_PROFILE` - Profile name for Ghost
- `CALCOM_MCP_KEY` - Smithery key for Cal.com
- `CALCOM_MCP_PROFILE` - Profile name for Cal.com
- `SUPABASE_MCP_KEY` - Smithery key for Supabase
- `SUPABASE_MCP_PROFILE` - Profile name for Supabase

## Integration with LibreChat

Your `librechat.yaml` should reference these environment variables:

```yaml
mcpServers:
  n8n:
    type: streamable-http
    url: "https://server.smithery.ai/@guinness77/n8n-mcp-server/mcp"
    params:
      api_key: "${N8N_MCP_KEY}"
      profile: "${N8N_MCP_PROFILE}"
  # ... other servers
```

## Troubleshooting

### "Not Authorized" Error
- Make sure your Railway token has "Manage Variables" permission
- Verify you're using a Service Token, not a personal token
- Check that the token is for the correct project

### Missing Configuration
- The function will skip servers if their required config params are missing
- Check the console output to see which servers were skipped and why

### Smithery CLI Errors
- Ensure your `SMITHERY_API_KEY` is valid
- Check that you have internet connectivity
- Verify the MCP server paths are correct

## Adding New MCP Servers

To add a new MCP server, edit the `MCP_SERVERS` array in `railway-mcp-sync.ts`:

```typescript
{
  name: "your-service",
  smitheryPath: "@provider/your-mcp-server",
  envVarPrefix: "YOURSERVICE",
  configParams: {
    // Any required config parameters
    apiKey: process.env.YOURSERVICE_API_KEY || "",
  }
}
``` 