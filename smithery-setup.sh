#!/bin/sh

# AlfredOS Smithery Setup Script
# This script automates the generation of Smithery keys for MCP servers

echo "🚀 AlfredOS Smithery Setup"

# Function to parse Smithery install output and extract key/profile
parse_smithery_output() {
    local output="$1"
    # Extract key and profile from the command output
    # Looking for patterns like --key xxx --profile yyy
    local key=$(echo "$output" | grep -oE '\--key\s+[a-f0-9-]+' | awk '{print $2}')
    local profile=$(echo "$output" | grep -oE '\--profile\s+[a-zA-Z0-9-]+' | awk '{print $2}')
    
    if [ -n "$key" ] && [ -n "$profile" ]; then
        echo "KEY=$key"
        echo "PROFILE=$profile"
        return 0
    else
        return 1
    fi
}

# Function to setup a single MCP server
setup_mcp_server() {
    local server_name="$1"
    local smithery_server="$2"
    local env_prefix="$3"
    
    echo "📦 Setting up $server_name..."
    
    # Run Smithery install command and capture output
    output=$(npx -y @smithery/cli@latest install "$smithery_server" --client librechat 2>&1)
    
    if [ $? -eq 0 ]; then
        # Parse the output to get key and profile
        if parsed=$(parse_smithery_output "$output"); then
            eval "$parsed"
            echo "✅ Successfully configured $server_name"
            echo "   Key: $KEY"
            echo "   Profile: $PROFILE"
            
            # Export to environment
            export "${env_prefix}_MCP_KEY=$KEY"
            export "${env_prefix}_MCP_PROFILE=$PROFILE"
            
            # Optionally save to .env file
            if [ -n "$SAVE_TO_ENV_FILE" ]; then
                echo "${env_prefix}_MCP_KEY=$KEY" >> .env.mcp
                echo "${env_prefix}_MCP_PROFILE=$PROFILE" >> .env.mcp
            fi
        else
            echo "⚠️  Could not parse Smithery output for $server_name"
        fi
    else
        echo "❌ Failed to setup $server_name"
    fi
}

# Main setup process
main() {
    # Create .env.mcp file if saving
    if [ -n "$SAVE_TO_ENV_FILE" ]; then
        echo "# AlfredOS MCP Server Configurations" > .env.mcp
        echo "# Generated on $(date)" >> .env.mcp
        echo "" >> .env.mcp
    fi
    
    # Setup n8n if requested
    if [ -n "$SETUP_N8N" ] || [ "$1" = "n8n" ]; then
        setup_mcp_server "n8n" "@guinness77/n8n-mcp-server" "N8N"
    fi
    
    # Setup Ghost if requested
    if [ -n "$SETUP_GHOST" ] || [ "$1" = "ghost" ]; then
        setup_mcp_server "Ghost" "@modelcontextprotocol/server-ghost" "GHOST"
    fi
    
    # Setup Cal.com if requested
    if [ -n "$SETUP_CALCOM" ] || [ "$1" = "calcom" ]; then
        setup_mcp_server "Cal.com" "@calcom/mcp-server" "CALCOM"
    fi
    
    # Setup Supabase if requested
    if [ -n "$SETUP_SUPABASE" ] || [ "$1" = "supabase" ]; then
        setup_mcp_server "Supabase" "@supabase/mcp-server" "SUPABASE"
    fi
    
    # Setup all if requested
    if [ "$1" = "all" ]; then
        setup_mcp_server "n8n" "@guinness77/n8n-mcp-server" "N8N"
        setup_mcp_server "Ghost" "@modelcontextprotocol/server-ghost" "GHOST"
        setup_mcp_server "Cal.com" "@calcom/mcp-server" "CALCOM"
        setup_mcp_server "Supabase" "@supabase/mcp-server" "SUPABASE"
    fi
    
    echo ""
    echo "✨ Setup complete!"
    
    if [ -n "$SAVE_TO_ENV_FILE" ]; then
        echo "📄 Environment variables saved to .env.mcp"
        echo "   Source it with: source .env.mcp"
    fi
}

# Show usage if no arguments
if [ $# -eq 0 ] && [ -z "$SETUP_N8N" ] && [ -z "$SETUP_GHOST" ] && [ -z "$SETUP_CALCOM" ] && [ -z "$SETUP_SUPABASE" ]; then
    echo "Usage: $0 [n8n|ghost|calcom|supabase|all]"
    echo ""
    echo "Or set environment variables:"
    echo "  SETUP_N8N=1 $0"
    echo "  SETUP_GHOST=1 $0"
    echo "  SETUP_CALCOM=1 $0"
    echo "  SETUP_SUPABASE=1 $0"
    echo ""
    echo "To save to .env file:"
    echo "  SAVE_TO_ENV_FILE=1 $0 all"
    exit 1
fi

main "$@" 