// Automate Smithery OAuth flow for MCP servers
const puppeteer = require('puppeteer');

async function automateOAuth(authUrl, smitheryEmail, smitheryPassword, serviceConfig) {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to OAuth URL
    await page.goto(authUrl, { waitUntil: 'networkidle0' });
    
    // Login to Smithery
    await page.waitForSelector('input[type="email"], input[name="email"]');
    await page.type('input[type="email"], input[name="email"]', smitheryEmail);
    await page.type('input[type="password"], input[name="password"]', smitheryPassword);
    await page.click('button[type="submit"]');
    
    // Wait for service configuration page
    await page.waitForNavigation();
    
    // Fill in service-specific configuration
    for (const [fieldName, value] of Object.entries(serviceConfig)) {
      const selector = `input[name="${fieldName}"], input[placeholder*="${fieldName}"]`;
      await page.waitForSelector(selector);
      await page.type(selector, value);
    }
    
    // Click authorize button
    await page.click('button:contains("Authorize"), button:contains("Allow")');
    
    // Wait for redirect back to LibreChat
    await page.waitForNavigation();
    
    console.log('OAuth completed successfully');
    
  } catch (error) {
    console.error('OAuth automation failed:', error);
  } finally {
    await browser.close();
  }
}

// Usage
async function setupAllMCPServers() {
  const servers = [
    {
      name: 'n8n',
      authUrl: process.env.N8N_OAUTH_URL, // From LibreChat logs
      config: {
        apiUrl: process.env.N8N_URL,
        apiKey: process.env.N8N_API_KEY
      }
    },
    {
      name: 'ghost',
      authUrl: process.env.GHOST_OAUTH_URL,
      config: {
        ghostApiUrl: process.env.GHOST_API_URL,
        ghostStaffApiKey: process.env.GHOST_STAFF_API_KEY
      }
    }
    // Add more servers...
  ];
  
  for (const server of servers) {
    console.log(`Setting up ${server.name}...`);
    await automateOAuth(
      server.authUrl,
      process.env.SMITHERY_EMAIL,
      process.env.SMITHERY_PASSWORD,
      server.config
    );
  }
}

// Run if called directly
if (require.main === module) {
  setupAllMCPServers().catch(console.error);
} 