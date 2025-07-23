// railway-mcp-sync-simple.ts – Simplified Railway Function for MCP env vars

/* ------------------------------------------------------------------ */
/*  Environment                                                       */
/* ------------------------------------------------------------------ */
const BACKBOARD = "https://backboard.railway.app/graphql/v2";
const PROJECT = process.env.RAILWAY_PROJECT_ID!;
const ENV = process.env.RAILWAY_ENVIRONMENT_ID!;
const RW_TOKEN = process.env.RAILWAY_TOKEN!;
const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY!;

/* ------------------------------------------------------------------ */
/*  MCP Server configurations                                         */
/* ------------------------------------------------------------------ */
interface MCPConfig {
  envPrefix: string;
  profile: string;
}

// These profiles match what you'd use with Smithery CLI
const MCP_CONFIGS: MCPConfig[] = [
  { envPrefix: "N8N", profile: "n8n" },
  { envPrefix: "GHOST", profile: "ghost" },
  { envPrefix: "CALCOM", profile: "calcom" },
  { envPrefix: "SUPABASE", profile: "supabase" },
];

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
  console.log("🚀 Setting MCP environment variables for LibreChat...\n");
  
  // Build all the environment variables
  const variables: Record<string, string> = {};
  
  for (const config of MCP_CONFIGS) {
    // Each MCP server needs:
    // 1. The Smithery API key (same for all)
    // 2. A profile name (usually the service name)
    variables[`${config.envPrefix}_MCP_KEY`] = SMITHERY_API_KEY;
    variables[`${config.envPrefix}_MCP_PROFILE`] = config.profile;
    
    console.log(`✅ Configured ${config.envPrefix}: profile=${config.profile}`);
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
  console.log("\n⚠️  Important: Make sure you have also set these service-specific variables:");
  console.log("  - GHOST_API_URL");
  console.log("  - GHOST_STAFF_API_KEY");
  console.log("  - CALCOM_API_KEY");
  console.log("  - SUPABASE_ACCESS_TOKEN");
}

// Run the main function
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
}); 