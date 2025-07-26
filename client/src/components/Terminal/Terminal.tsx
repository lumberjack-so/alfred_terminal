import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Constants } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks';
import { cn } from '~/utils';

interface TerminalProps {
  className?: string;
  conversationId?: string;
  endpoint?: string;
}

export default function Terminal({ className, conversationId, endpoint }: TerminalProps) {
  const { token } = useAuthContext();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

  const createSession = useCallback(async () => {
    try {
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || 'Failed to create terminal session');
      }

      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      console.error('Error creating terminal session:', error);
      if (xtermRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create terminal session';
        xtermRef.current.write(`\r\n\x1b[31mError: ${errorMessage}\x1b[0m\r\n`);
        
        // Show helpful message if terminal service is unavailable
        if (errorMessage.includes('not be available in this environment')) {
          xtermRef.current.write('\r\n\x1b[33mThe terminal service requires a shell environment.\x1b[0m\r\n');
          xtermRef.current.write('\x1b[33mThis feature may not work in containerized environments without proper shell access.\x1b[0m\r\n');
        }
      }
      return null;
    }
  }, [token]);

  const connectWebSocket = useCallback((sessionId: string) => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create WebSocket connection with session ID
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/terminal/ws?sessionId=${sessionId}`;
    
    console.log('[Terminal] Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Setup ping interval to keep connection alive
    let pingInterval: NodeJS.Timeout;

    ws.onopen = () => {
      console.log('Terminal WebSocket connected');
      
      // Send ping every 30 seconds to keep connection alive
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Terminal] Received message:', message.type, message.data?.length || 0, 'chars');
        
        switch (message.type) {
          case 'ready':
            if (xtermRef.current) {
              xtermRef.current.write('\r\n\x1b[32mConnected to terminal session\x1b[0m\r\n');
              xtermRef.current.write(`\x1b[36mCurrent directory: ${message.currentDir}\x1b[0m\r\n\r\n`);
            }
            break;
          
          case 'output':
            if (xtermRef.current) {
              xtermRef.current.write(message.data);
            }
            break;
          
          case 'error':
            if (xtermRef.current) {
              xtermRef.current.write(`\r\n\x1b[31mError: ${message.data}\x1b[0m\r\n`);
            }
            // Check for authentication errors
            if (message.data && message.data.includes('Session ID required')) {
              console.error('Terminal session ID missing');
            } else if (message.data && message.data.includes('Invalid session')) {
              console.error('Terminal session invalid or expired');
              // Optionally try to create a new session
            }
            break;
          
          case 'clear':
            if (xtermRef.current) {
              xtermRef.current.clear();
            }
            break;
          
          case 'exit':
            if (xtermRef.current) {
              xtermRef.current.write(`\r\n\x1b[33mProcess exited with code ${message.code}\x1b[0m\r\n`);
            }
            break;
          
          case 'pong':
            // Keep-alive response received
            break;
        }
      } catch (error) {
        // Handle non-JSON messages (backward compatibility)
        if (xtermRef.current) {
          xtermRef.current.write(event.data);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
      }
    };

    ws.onclose = () => {
      console.log('Terminal WebSocket closed');
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[33mDisconnected from terminal session\x1b[0m\r\n');
      }
    };
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    
    // For terminal sessions, we always need to create a session, even for new conversations
    const isValidConversation = conversationId && conversationId !== Constants.NEW_CONVO;
    if (!isValidConversation) {
      // For new conversations, we still need to initialize the terminal
      console.log('Initializing terminal for new conversation');
    }

    // Initialize terminal with theme-aware colors
    const term = new XTerm({
      theme: {
        background: 'rgba(33, 33, 33, 1)', // Same for both light and dark modes
        foreground: '#e5e7eb', // Light text color for better contrast
        cursor: '#10b981',
        cursorAccent: 'rgba(33, 33, 33, 1)',
        selectionBackground: isDarkMode ? '#374151' : '#e5e7eb',
        selectionForeground: isDarkMode ? '#e5e7eb' : '#1f2937',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: isDarkMode ? '#e5e7eb' : '#1f2937',
        brightBlack: '#6b7280',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: isDarkMode ? '#f9fafb' : '#111827',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 10000,
    });

    xtermRef.current = term;

    // Initialize addons
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);

    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    // Open terminal in the DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    // Display initial message
    term.write('\x1b[1;34m╔══════════════════════════════════════════════════════════╗\x1b[0m\r\n');
    term.write('\x1b[1;34m║\x1b[0m  \x1b[1;32mClaude Code Terminal\x1b[0m - Powered by LibreChat         \x1b[1;34m║\x1b[0m\r\n');
    term.write('\x1b[1;34m╚══════════════════════════════════════════════════════════╝\x1b[0m\r\n');
    term.write('\r\n\x1b[33mCreating terminal session...\x1b[0m\r\n');

    // Handle terminal input
    term.onData((data) => {
      console.log('[Terminal] Sending data:', data, 'Length:', data.length, 'Codes:', data.split('').map(c => c.charCodeAt(0)));
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send command to backend
        wsRef.current.send(JSON.stringify({ type: 'command', command: data }));
      } else {
        console.error('[Terminal] WebSocket not ready, state:', wsRef.current?.readyState);
      }
    });

    // Handle terminal resize events
    term.onResize((size) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'resize', 
          cols: size.cols, 
          rows: size.rows 
        }));
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Create session and connect WebSocket
    const initializeTerminal = async () => {
      const newSessionId = await createSession();
      if (newSessionId) {
        setSessionId(newSessionId);
        connectWebSocket(newSessionId);
      }
    };

    initializeTerminal();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [conversationId, createSession, connectWebSocket, token, isDarkMode]);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        fetch(`/api/terminal/session/${sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).catch(error => console.error('Error destroying session:', error));
      }
    };
  }, [sessionId, token]);

  // Handle resize when parent container changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      className={cn(
        'h-full w-full overflow-hidden',
        className
      )}
    />
  );
}