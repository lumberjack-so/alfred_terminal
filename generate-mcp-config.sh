#!/bin/sh

# AlfredOS MCP Configuration Generator
# This script generates MCP server configurations for LibreChat from Smithery

echo "🔧 AlfredOS MCP Configuration Generator"

# Function to extract connection details from Smithery install command output
generate_mcp_config() {
    local server_name="$1"
    local smithery_server="$2"
    local smithery_key="${3:-$SMITHERY_KEY}"
    local smithery_profile="${4:-$SMITHERY_PROFILE}"
    
    if [ -z "$smithery_key" ] || [ -z "$smithery_profile" ]; then
        echo "❌ Error: SMITHERY_KEY and SMITHERY_PROFILE must be set"
        return 1
    fi
    
    # Generate the YAML configuration for this MCP server
    cat << EOF
  $server_name:
    type: streamable-http
    url: "https://server.smithery.ai/$smithery_server/mcp"
    headers:
      Authorization: "Bearer dummy"
    params:
      api_key: "$smithery_key"
      profile: "$smithery_profile"
    timeout: 30000
    initTimeout: 10000
EOF
}

# If called with arguments, generate config for a specific server
if [ $# -gt 0 ]; then
    generate_mcp_config "$@"
    exit 0
fi

# Otherwise, generate full librechat.yaml with MCP servers
cat << 'EOF'
# AlfredOS LibreChat Configuration
# Auto-generated MCP server configurations

version: 1.2.1
cache: true

interface:
  customWelcome: "Welcome to AlfredOS!"
  mcpServers:
    placeholder: 'Skills'
  privacyPolicy:
    externalUrl: 'https://lumberjack.so/privacy-policy'
    openNewTab: true
  termsOfService:
    externalUrl: 'https://lumberjack.so/tos'
    openNewTab: true
    modalAcceptance: true
    modalTitle: "Terms of Service for AlfredOS"
    modalContent: |
      # Terms and Conditions for AlfredOS
      *Effective Date: December 1, 2024*
      
      Welcome to AlfredOS, the click-to-deploy business operating system for solopreneurs and indie teams, developed by Ugly Code LLC and available at https://lumberjack.so.
      
      ## 1. Open Source License
      AlfredOS is open-source software licensed under the MIT License.
      
      ## 2. Contact Information
      Ugly Code LLC
      166 Geary St, STE1500 #631
      San Francisco, CA 94108, USA
      
      More information available at: https://lumberjack.so

registration:
  socialLogins: ['github', 'google', 'discord', 'openid', 'facebook', 'apple', 'saml']

endpoints:
  custom:
    - name: 'OpenRouter'
      apiKey: '${OPENROUTER_KEY}'
      baseURL: 'https://openrouter.ai/api/v1'
      models:
        default: ['meta-llama/llama-3-70b-instruct']
        fetch: true
      titleConvo: true
      titleModel: 'meta-llama/llama-3-70b-instruct'
      dropParams: ['stop']
      modelDisplayLabel: 'OpenRouter'

# MCP Servers Configuration
mcpServers:
EOF

# Add n8n MCP server if configured
if [ -n "$N8N_MCP_KEY" ] && [ -n "$N8N_MCP_PROFILE" ]; then
    echo "# n8n Integration"
    generate_mcp_config "n8n" "@guinness77/n8n-mcp-server" "$N8N_MCP_KEY" "$N8N_MCP_PROFILE"
fi

# Add Ghost MCP server if configured
if [ -n "$GHOST_MCP_KEY" ] && [ -n "$GHOST_MCP_PROFILE" ]; then
    echo "# Ghost CMS Integration"
    generate_mcp_config "ghost" "@modelcontextprotocol/server-ghost" "$GHOST_MCP_KEY" "$GHOST_MCP_PROFILE"
fi

# Add Cal.com MCP server if configured
if [ -n "$CALCOM_MCP_KEY" ] && [ -n "$CALCOM_MCP_PROFILE" ]; then
    echo "# Cal.com Integration"
    generate_mcp_config "calcom" "@calcom/mcp-server" "$CALCOM_MCP_KEY" "$CALCOM_MCP_PROFILE"
fi

# Add Supabase MCP server if configured
if [ -n "$SUPABASE_MCP_KEY" ] && [ -n "$SUPABASE_MCP_PROFILE" ]; then
    echo "# Supabase Integration"
    generate_mcp_config "supabase" "@supabase/mcp-server" "$SUPABASE_MCP_KEY" "$SUPABASE_MCP_PROFILE"
fi

# Add any additional MCP servers from environment
if [ -n "$ADDITIONAL_MCP_SERVERS" ]; then
    echo "# Additional MCP Servers"
    echo "$ADDITIONAL_MCP_SERVERS"
fi 