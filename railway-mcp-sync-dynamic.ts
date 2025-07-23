// railway-mcp-sync-dynamic.ts – Dynamic Railway Function that reads Smithery config

import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

/* ------------------------------------------------------------------ */
/*  Environment                                                       */
/* ------------------------------------------------------------------ */
const BACKBOARD = "https://backboard.railway.app/graphql/v2";
const PROJECT = process.env.RAILWAY_PROJECT_ID!;
const ENV = process.env.RAILWAY_ENVIRONMENT_ID!;
const RW_TOKEN = process.env.RAILWAY_TOKEN!;
const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY!;

/* ------------------------------------------------------------------ */
/*  Smithery config paths                                             */
/* ------------------------------------------------------------------ */
const SMITHERY_CONFIG_PATHS = [
  join(homedir(), '.config', 'smithery', 'config.json'),
  join(homedir(), '.smithery', 'config.json'),
  './smithery.json',
  './librechat.json'
];

/* ------------------------------------------------------------------ */
/*  Service name mapping                                              */
/* ------------------------------------------------------------------ */
const SERVICE_NAME_MAP: Record<string, string> = {
  'n8n-mcp-server': 'N8N',
  'ghost-mcp': 'GHOST',
  'cal_dot_com_mcpserver': 'CALCOM',
  'supabase-mcp': 'SUPABASE',
};

/* ------------------------------------------------------------------ */
/*  Read Smithery configuration                                       */
/* ------------------------------------------------------------------ */
async function readSmitheryConfig(): Promise<any> {
  for (const path of SMITHERY_CONFIG_PATHS) {
    try {
      const content = await readFile(path, 'utf-8');
      console.log(`Found Smithery config at: ${path}`);
      return JSON.parse(content);
    } catch (error) {
      // Continue to next path
    }
  }
  throw new Error('Could not find Smithery configuration file');
}

/* ------------------------------------------------------------------ */
/*  Parse MCP servers from config                                     */
/* ------------------------------------------------------------------ */
function parseMCPServers(config: any): Array<{ name: string; profile: string }> {
  const servers: Array<{ name: string; profile: string }> = [];
  
  // Check if config has mcpServers section
  if (config.mcpServers) {
    for (const [key, value] of Object.entries(config.mcpServers)) {
      const envPrefix = SERVICE_NAME_MAP[key] || key.toUpperCase();
      servers.push({
        name: envPrefix,
        profile: key
      });
    }
  }
  
  // Also check for librechat format
  if (config.librechat?.mcpServers) {
    for (const [key, value] of Object.entries(config.librechat.mcpServers)) {
      const envPrefix = SERVICE_NAME_MAP[key] || key.toUpperCase();
      servers.push({
        name: envPrefix,
        profile: key
      });
    }
  }
  
  return servers;
}

/* ------------------------------------------------------------------ */
/*  Build Railway GraphQL mutation                                    */
/* ------------------------------------------------------------------ */
function buildMutation(variables: Record<string, string>): string {
  const mutations = Object.entries(variables).map(([name, value]) => {
    const escapedValue = value.replace(/"/g, '\\"');
    return `
      ${name}: variableUpsert(input: {
        projectId: "${PROJECT}"
        environmentId: "${ENV}"
        name: "${name}"
        value: "${escapedValue}"
      })
    `;
  }).join("\n");

  return `mutation SetMCPVariables {
    ${mutations}
  }`;
}

/* ------------------------------------------------------------------ */
/*  Main function                                                     */
/* ------------------------------------------------------------------ */
async function main() {
  console.log("🚀 Reading Smithery configuration and setting MCP environment variables...\n");
  
  try {
    // Read Smithery config
    const config = await readSmitheryConfig();
    const servers = parseMCPServers(config);
    
    if (servers.length === 0) {
      console.warn("⚠️  No MCP servers found in Smithery configuration");
      console.log("Make sure you've installed MCP servers using: smithery install <server-name>");
      process.exit(1);
    }
    
    console.log(`Found ${servers.length} MCP servers in configuration:\n`);
    
    // Build environment variables
    const variables: Record<string, string> = {};
    
    for (const server of servers) {
      variables[`${server.name}_MCP_KEY`] = SMITHERY_API_KEY;
      variables[`${server.name}_MCP_PROFILE`] = server.profile;
      
      console.log(`✅ Configured ${server.name}: profile=${server.profile}`);
    }
    
    // Update Railway variables
    console.log("\nUpdating Railway environment variables...");
    
    const query = buildMutation(variables);
    
    const res = await fetch(BACKBOARD, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RW_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    }).then((r) => r.json());
    
    if (res.errors) {
      console.error("❌ Failed to update variables:", JSON.stringify(res.errors, null, 2));
      
      if (res.errors.some((e: any) => e.message.includes("Not Authorized"))) {
        console.error("\n⚠️  Token appears to lack permissions. Please ensure:");
        console.error("1. You're using a Service Token (not a personal token)");
        console.error("2. The token was created with 'Manage Variables' permission");
        console.error("3. The token is for the correct project");
      }
      process.exit(1);
    }
    
    console.log("\n✅ Railway variables updated successfully!");
    console.log("\n📋 Variables set:");
    Object.keys(variables).forEach(key => {
      console.log(`  - ${key}`);
    });
    
    console.log("\n🎉 MCP configuration complete!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    console.log("\n💡 Tip: Make sure you've installed MCP servers first:");
    console.log("  smithery install @guinness77/n8n-mcp-server");
    console.log("  smithery install @MFYDev/ghost-mcp");
    console.log("  smithery install @mumunha/cal_dot_com_mcpserver");
    console.log("  smithery install @supabase-community/supabase-mcp");
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
}); 