/**
 * Simple test script to verify terminal functionality
 * Run this with: node test-terminal.js
 */

const http = require('http');
const WebSocket = require('ws');

const API_BASE = 'http://localhost:3080';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

async function createTerminalSession() {
  console.log('1. Creating terminal session...');
  
  const response = await fetch(`${API_BASE}/api/terminal/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    }
  });

  if (!response.ok) {
    console.error('Failed to create session:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response:', text);
    return null;
  }

  const data = await response.json();
  console.log('Session created:', data);
  return data.sessionId;
}

function testWebSocket(sessionId) {
  console.log('\n2. Testing WebSocket connection...');
  
  const wsUrl = `ws://localhost:3080/api/terminal/ws?sessionId=${sessionId}`;
  console.log('Connecting to:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.on('open', () => {
    console.log('WebSocket connected successfully!');
    
    // Send a test command
    console.log('Sending test command: echo "Hello Terminal"');
    ws.send(JSON.stringify({ 
      type: 'command', 
      command: 'echo "Hello Terminal"\n' 
    }));
    
    // Send another command after a delay
    setTimeout(() => {
      console.log('Sending pwd command');
      ws.send(JSON.stringify({ 
        type: 'command', 
        command: 'pwd\n' 
      }));
    }, 1000);
    
    // Close connection after 5 seconds
    setTimeout(() => {
      console.log('Closing connection...');
      ws.close();
    }, 5000);
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received:', message.type, '-', message.data || message);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });
}

async function runTests() {
  console.log('Starting terminal tests...\n');
  
  try {
    // First check if server is running
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      console.error('Server is not running at', API_BASE);
      console.error('Please start the server first with: npm run backend:dev');
      return;
    }
    console.log('Server is running');
    
    // Create session
    const sessionId = await createTerminalSession();
    if (!sessionId) {
      console.error('Failed to create session. Check your JWT token.');
      return;
    }
    
    // Test WebSocket
    testWebSocket(sessionId);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Instructions
console.log('=====================================================');
console.log('Terminal Test Script');
console.log('=====================================================');
console.log('Before running this test:');
console.log('1. Start the backend server: npm run backend:dev');
console.log('2. Get a valid JWT token from browser dev tools:');
console.log('   - Open LibreChat in browser');
console.log('   - Login');
console.log('   - Open DevTools > Application > Cookies');
console.log('   - Copy the value of "token" cookie');
console.log('3. Replace TEST_TOKEN in this script with your token');
console.log('=====================================================\n');

// Check if token is set
if (TEST_TOKEN === 'your-jwt-token-here') {
  console.error('ERROR: Please set TEST_TOKEN with a valid JWT token first!');
  process.exit(1);
}

// Run tests
runTests();