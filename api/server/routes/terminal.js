const express = require('express');
const WebSocket = require('ws');
const { requireJwtAuth } = require('~/server/middleware');
const TerminalService = require('~/server/services/TerminalService');
const logger = require('~/config/winston');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    wsSupport: true,
    message: 'Terminal service is running'
  });
});

// REST endpoints
router.post('/create', requireJwtAuth, async (req, res) => {
  try {
    logger.info('[Terminal] Creating session for user:', req.user.id);
    const userId = req.user.id;
    const result = await TerminalService.createSession(userId);
    
    if (!result) {
      logger.error('[Terminal] Session creation returned null');
      return res.status(500).json({ 
        error: 'Failed to create terminal session',
        details: 'Terminal initialization failed. The terminal service may not be available in this environment.' 
      });
    }
    
    const { sessionId, session } = result;
    logger.info('[Terminal] Session created successfully:', { sessionId, userId });
    
    res.json({
      sessionId,
      baseDir: session.baseDir,
      currentDir: session.currentDir
    });
  } catch (error) {
    logger.error('[Terminal] Error creating session:', error);
    res.status(500).json({ 
      error: 'Failed to create terminal session',
      details: error.message || 'Unknown error occurred' 
    });
  }
});

router.get('/sessions', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = TerminalService.getSessionsByUser(userId);
    res.json({ sessions });
  } catch (error) {
    logger.error('[Terminal] Error getting sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

router.delete('/session/:sessionId', requireJwtAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = TerminalService.getSession(sessionId);
    
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    TerminalService.destroySession(sessionId);
    res.json({ message: 'Session destroyed' });
  } catch (error) {
    logger.error('[Terminal] Error destroying session:', error);
    res.status(500).json({ error: 'Failed to destroy session' });
  }
});

router.get('/history/:sessionId', requireJwtAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = TerminalService.getSession(sessionId);
    
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const history = session.getHistory();
    res.json({ history });
  } catch (error) {
    logger.error('[Terminal] Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// WebSocket handler setup function
function setupWebSocket(server) {
  try {
    logger.info('[Terminal] Setting up WebSocket server');
    
    // Create WebSocket server without path to handle manual upgrade
    const wss = new WebSocket.Server({ 
      noServer: true, // Don't create HTTP server, we'll handle upgrade manually
      perMessageDeflate: false, // Disable compression for better compatibility
      clientTracking: true
    });

    // Handle HTTP upgrade manually for better control
    server.on('upgrade', (request, socket, head) => {
      try {
        logger.info('[Terminal] Upgrade request:', {
          url: request.url,
          headers: request.headers
        });

        // Check if this is a terminal WebSocket request
        if (request.url && request.url.startsWith('/api/terminal/ws')) {
          wss.handleUpgrade(request, socket, head, (ws) => {
            logger.info('[Terminal] WebSocket upgrade successful');
            wss.emit('connection', ws, request);
          });
        } else {
          // Not a terminal WebSocket request
          socket.destroy();
        }
      } catch (error) {
        logger.error('[Terminal] Error during WebSocket upgrade:', error);
        socket.destroy();
      }
    });

  wss.on('error', (error) => {
    logger.error('[Terminal] WebSocket server error:', error);
  });

  wss.on('listening', () => {
    logger.info('[Terminal] WebSocket server is listening on path /api/terminal/ws');
  });

  wss.on('connection', async (ws, req) => {
    let sessionId = null;
    let session = null;
    let userId = null;

    logger.info('[Terminal] New WebSocket connection established', {
      url: req.url,
      headers: req.headers
    });

    // Parse session ID from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      logger.warn('[Terminal] WebSocket connection missing session ID');
      ws.send(JSON.stringify({ type: 'error', data: 'Session ID required' }));
      ws.close();
      return;
    }

    session = TerminalService.getSession(sessionId);
    if (!session) {
      logger.warn(`[Terminal] Invalid session ID: ${sessionId}`);
      ws.send(JSON.stringify({ type: 'error', data: 'Invalid session' }));
      ws.close();
      return;
    }

    userId = session.userId;
    logger.info(`[Terminal] WebSocket connected for session ${sessionId}, user ${userId}`);

    // Set up event handlers
    session.on('output', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    session.on('error', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', data }));
      }
    });

    session.on('clear', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'clear' }));
      }
    });

    session.on('exit', (code) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'exit', code }));
        ws.close();
      }
    });

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'command':
            await session.executeCommand(data.command);
            break;
          
          case 'resize':
            session.resize(data.cols, data.rows);
            break;
          
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              data: `Unknown message type: ${data.type}` 
            }));
        }
      } catch (error) {
        logger.error('[Terminal] WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          data: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      logger.info(`[Terminal] WebSocket disconnected for session ${sessionId}`);
      // Remove event listeners to prevent memory leaks
      session.removeAllListeners('output');
      session.removeAllListeners('error');
      session.removeAllListeners('clear');
      session.removeAllListeners('exit');
    });

    ws.on('error', (error) => {
      logger.error('[Terminal] WebSocket error:', error);
    });

    // Send ready message
    ws.send(JSON.stringify({ 
      type: 'ready', 
      sessionId,
      currentDir: session.currentDir 
    }));
  });

    logger.info('[Terminal] WebSocket server setup complete');
    return wss;
  } catch (error) {
    logger.error('[Terminal] Failed to setup WebSocket server:', error);
    // Return a dummy object to prevent crashes
    return {
      on: () => {},
      emit: () => {},
      clients: new Set()
    };
  }
}

// Export router and WebSocket setup
module.exports = {
  router,
  setupWebSocket
};