// Script to extract OAuth tokens after initial authentication
// Run this after completing OAuth flow once

const mongoose = require('mongoose');

// Connect to your MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/LibreChat');

async function extractTokens() {
  try {
    // Find OAuth tokens in the database
    // Note: The exact collection/schema depends on LibreChat's implementation
    const db = mongoose.connection.db;
    
    // Look for MCP OAuth tokens
    const tokens = await db.collection('mcp_oauth_tokens').find({}).toArray();
    
    console.log('Found OAuth tokens:');
    tokens.forEach(token => {
      console.log(`\n# ${token.serverName} tokens`);
      console.log(`MCP_${token.serverName.toUpperCase()}_ACCESS_TOKEN=${token.accessToken}`);
      console.log(`MCP_${token.serverName.toUpperCase()}_REFRESH_TOKEN=${token.refreshToken}`);
    });
    
  } catch (error) {
    console.error('Error extracting tokens:', error);
  } finally {
    mongoose.connection.close();
  }
}

extractTokens(); 