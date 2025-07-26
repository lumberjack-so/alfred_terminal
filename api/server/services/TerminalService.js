const path = require('path');
const { spawn, exec } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('~/config/winston');

// Allowed commands for security
const ALLOWED_COMMANDS = [
  'ls', 'dir', 'pwd', 'cd', 'echo', 'cat', 'type', 'mkdir', 'touch', 
  'rm', 'del', 'cp', 'copy', 'mv', 'move', 'node', 'npm', 'yarn',
  'git', 'python', 'pip', 'clear', 'cls', 'sh', 'bash', 'which',
  'env', 'export', 'whoami', 'hostname', 'uname', 'date', 'ps',
  'grep', 'find', 'head', 'tail', 'less', 'more', 'vi', 'nano'
];

// Windows command mappings
const WINDOWS_COMMAND_MAP = {
  'ls': 'dir',
  'pwd': 'cd',
  'cat': 'type',
  'rm': 'del',
  'cp': 'copy',
  'mv': 'move',
  'touch': 'type nul >',
  'clear': 'cls'
};

class TerminalSession extends EventEmitter {
  constructor(sessionId, userId, baseDir) {
    super();
    this.sessionId = sessionId;
    this.userId = userId;
    this.baseDir = baseDir || path.join(process.cwd(), 'app', 'terminal', 'alfred');
    this.currentDir = this.baseDir;
    this.history = [];
    this.shell = null;
    this.isWindows = process.platform === 'win32';
    this.commandQueue = [];
    this.isProcessing = false;
    this.fallbackMode = false; // Track if we're in fallback mode
    this.inputBuffer = ''; // Buffer for accumulating input
    this.localEcho = true; // Whether to echo input back
  }

  async initialize() {
    try {
      // Ensure base directory exists
      logger.info(`[TerminalService] Creating directory: ${this.baseDir}`);
      await fs.mkdir(this.baseDir, { recursive: true, mode: 0o755 });
      
      // Verify directory was created and check permissions
      try {
        const stats = await fs.stat(this.baseDir);
        if (!stats.isDirectory()) {
          throw new Error('Failed to create base directory');
        }
        
        // Test write permissions
        const testFile = path.join(this.baseDir, '.test-write');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        logger.info('[TerminalService] Directory created with write permissions');
      } catch (err) {
        logger.error('[TerminalService] Directory permission error:', err);
        throw new Error(`Directory permission error: ${err.message}`);
      }
      
      logger.info(`[TerminalService] Initializing shell for platform: ${process.platform}`);
      
      // Initialize shell based on platform
      if (this.isWindows) {
        this.shell = spawn('cmd.exe', ['/Q'], {
          cwd: this.currentDir,
          env: { ...process.env, PROMPT: '$P$G' },
          shell: true
        });
      } else {
        // Try to find a suitable shell - prefer bash if available
        let shellPath = process.env.SHELL || '/bin/sh';
        
        // Check if bash is available
        try {
          const bashExists = await fs.access('/bin/bash').then(() => true).catch(() => false);
          if (bashExists) {
            shellPath = '/bin/bash';
          }
        } catch (e) {
          // Ignore error, use default shell
        }
        
        logger.info(`[TerminalService] Using shell: ${shellPath}`);
        
        try {
          // Log detailed spawn attempt
          logger.info('[TerminalService] Attempting to spawn shell with:', {
            shellPath,
            cwd: this.currentDir,
            platform: process.platform,
            env: {
              PATH: process.env.PATH,
              SHELL: process.env.SHELL,
              USER: process.env.USER,
              HOME: process.env.HOME
            }
          });
          
          // For Alpine/ash shell, use simpler options
          const shellArgs = shellPath.includes('sh') ? [] : ['-i'];
          
          this.shell = spawn(shellPath, shellArgs, {
            cwd: this.currentDir,
            env: { 
              ...process.env, 
              PS1: '$ ', // Simpler prompt for ash
              TERM: 'xterm',
              PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
            },
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            detached: false
          });
          
          // Check if spawn was successful
          if (!this.shell) {
            throw new Error('spawn returned null');
          }
          
          // Give it a moment to fail if it's going to
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          if (!this.shell.pid) {
            throw new Error('Shell process has no PID');
          }
          
          logger.info('[TerminalService] Shell spawned successfully with PID:', this.shell.pid);
          
          // Listen for immediate errors
          this.shell.once('error', (err) => {
            logger.error('[TerminalService] Shell runtime error:', {
              code: err.code,
              message: err.message,
              syscall: err.syscall,
              path: err.path
            });
            this.emit('error', `Terminal error: ${err.code || err.message}`);
          });
          
        } catch (spawnError) {
          logger.error('[TerminalService] Spawn failed with details:', {
            name: spawnError.name,
            message: spawnError.message,
            code: spawnError.code,
            syscall: spawnError.syscall,
            path: spawnError.path,
            stack: spawnError.stack
          });
          // Try fallback mode
          logger.warn('[TerminalService] Falling back to exec mode');
          this.fallbackMode = true;
          this.shell = null;
          
          // Still emit success but note we're in fallback mode
          this.emit('output', `Terminal initialized in fallback mode\n`);
          this.emit('output', `Working directory: ${this.currentDir}\n`);
          this.emit('output', `Note: Using command execution mode (non-interactive)\n\n`);
          this.emit('output', `$ `); // Show initial prompt
          
          return true;
        }
      }

      if (!this.fallbackMode) {
        this.setupShellHandlers();
        
        // For interactive shell, send a newline to trigger prompt display
        setTimeout(() => {
          if (this.shell && !this.shell.killed) {
            this.shell.stdin.write('\n');
          }
        }, 100);
      }
      
      // Send initial directory
      this.emit('output', `Terminal initialized in ${this.currentDir}\n`);
      logger.info(`[TerminalService] Terminal session ${this.sessionId} initialized successfully`);
      
      return true;
    } catch (error) {
      logger.error('[TerminalService] Initialization error:', error);
      this.emit('error', `Terminal initialization failed: ${error.message}`);
      return false;
    }
  }

  setupShellHandlers() {
    if (!this.shell) {
      logger.error('[TerminalService] Cannot setup handlers - shell is null');
      return;
    }

    if (this.shell.stdout) {
      this.shell.stdout.on('data', (data) => {
        const output = data.toString();
        this.emit('output', output);
        this.addToHistory({ type: 'output', data: output, timestamp: new Date() });
      });
    }

    if (this.shell.stderr) {
      this.shell.stderr.on('data', (data) => {
        const error = data.toString();
        this.emit('error', error);
        this.addToHistory({ type: 'error', data: error, timestamp: new Date() });
      });
    }

    this.shell.on('exit', (code) => {
      logger.info(`[TerminalService] Shell exited with code: ${code}`);
      this.emit('exit', code);
      this.cleanup();
    });

    this.shell.on('error', (error) => {
      logger.error('[TerminalService] Shell error:', error);
      this.emit('error', `Shell error: ${error.message}`);
      // Don't throw - just handle gracefully
      this.cleanup();
    });
  }

  async executeCommand(command) {
    if (!command || command.trim() === '') {
      return;
    }

    const trimmedCommand = command.trim();
    const [cmd, ...args] = trimmedCommand.split(' ');
    
    // Check if command is allowed
    if (!this.isCommandAllowed(cmd)) {
      this.emit('error', `Command '${cmd}' is not allowed for security reasons.\n`);
      return;
    }

    // Add to history
    this.addToHistory({ type: 'command', data: trimmedCommand, timestamp: new Date() });

    // Handle special commands
    if (cmd === 'cd') {
      await this.handleCd(args.join(' '));
      return;
    }

    if (cmd === 'clear' || cmd === 'cls') {
      this.emit('clear');
      if (this.fallbackMode) {
        this.emit('output', '$ ');
      }
      return;
    }

    // Convert command if on Windows
    const actualCommand = this.isWindows && WINDOWS_COMMAND_MAP[cmd] 
      ? trimmedCommand.replace(cmd, WINDOWS_COMMAND_MAP[cmd])
      : trimmedCommand;

    // Execute command
    if (this.fallbackMode || !this.shell || this.shell.killed) {
      // Use exec for fallback mode or when shell is not available
      logger.debug('[TerminalService] Using exec for command:', actualCommand);
      this.executeWithExec(actualCommand);
    } else {
      // Try to use interactive shell
      try {
        this.shell.stdin.write(actualCommand + '\n');
      } catch (writeError) {
        logger.error('[TerminalService] Error writing to shell stdin:', writeError);
        // Fallback to exec
        this.executeWithExec(actualCommand);
      }
    }
  }

  async handleCd(targetPath) {
    try {
      const newPath = path.resolve(this.currentDir, targetPath);
      
      // Security check - ensure we stay within base directory
      const relativePath = path.relative(this.baseDir, newPath);
      if (relativePath.startsWith('..')) {
        this.emit('error', 'Cannot navigate outside the terminal directory.\n');
        return;
      }

      // Check if directory exists
      const stats = await fs.stat(newPath);
      if (!stats.isDirectory()) {
        this.emit('error', `Not a directory: ${targetPath}\n`);
        return;
      }

      this.currentDir = newPath;
      
      // Update shell working directory
      if (this.shell && !this.shell.killed) {
        const cdCommand = this.isWindows ? `cd /d "${newPath}"` : `cd "${newPath}"`;
        this.shell.stdin.write(cdCommand + '\n');
      }
      
      this.emit('output', `Changed directory to: ${this.currentDir}\n`);
      if (this.fallbackMode) {
        this.emit('output', '$ ');
      }
    } catch (error) {
      this.emit('error', `Cannot change directory: ${error.message}\n`);
      if (this.fallbackMode) {
        this.emit('output', '$ ');
      }
    }
  }

  executeWithExec(command) {
    exec(command, { 
      cwd: this.currentDir,
      maxBuffer: 1024 * 1024, // 1MB buffer
      env: { ...process.env, PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' }
    }, (error, stdout, stderr) => {
      if (error) {
        this.emit('error', `Error: ${error.message}\n`);
        if (this.fallbackMode) {
          this.emit('output', '$ ');
        }
        return;
      }
      if (stdout) {
        this.emit('output', stdout);
      }
      if (stderr) {
        this.emit('error', stderr);
      }
      // Show prompt in fallback mode
      if (this.fallbackMode) {
        this.emit('output', '$ ');
      }
    });
  }

  isCommandAllowed(command) {
    return ALLOWED_COMMANDS.includes(command.toLowerCase());
  }

  addToHistory(entry) {
    this.history.push(entry);
    // Keep only last 1000 entries
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }

  getHistory() {
    return this.history;
  }

  resize(cols, rows) {
    if (this.shell && !this.shell.killed) {
      // Terminal resize is not directly supported without node-pty
      // This is a placeholder for future implementation
      this.emit('resize', { cols, rows });
    }
  }

  async handleInput(data) {
    // Handle raw terminal input (keystrokes)
    logger.info(`[TerminalService] handleInput called with: '${data}', length: ${data.length}, fallbackMode: ${this.fallbackMode}, hasShell: ${!!this.shell}`);
    
    if (this.fallbackMode) {
      // In fallback mode, we need to handle line buffering ourselves
      for (const char of data) {
        const code = char.charCodeAt(0);
        
        // Handle special characters
        if (code === 13) { // Enter key
          if (this.inputBuffer.trim()) {
            // Echo the command
            this.emit('output', this.inputBuffer + '\n');
            // Execute the buffered command
            await this.executeCommand(this.inputBuffer);
            this.inputBuffer = '';
            // Show prompt after command completes
            setTimeout(() => {
              this.emit('output', '$ ');
            }, 100);
          } else {
            this.emit('output', '\n$ ');
          }
        } else if (code === 127 || code === 8) { // Backspace
          if (this.inputBuffer.length > 0) {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
            // Move cursor back, clear character, move back again
            this.emit('output', '\b \b');
          }
        } else if (code === 3) { // Ctrl+C
          this.inputBuffer = '';
          this.emit('output', '^C\n$ ');
        } else if (code >= 32 && code < 127) { // Printable characters
          this.inputBuffer += char;
          // Echo the character
          logger.info(`[TerminalService] Echoing character: '${char}' (code: ${code})`);
          this.emit('output', char);
        }
      }
    } else if (this.shell && !this.shell.killed) {
      // In interactive mode, pass input directly to shell
      try {
        logger.info('[TerminalService] Writing to shell stdin:', data);
        this.shell.stdin.write(data);
      } catch (error) {
        logger.error('[TerminalService] Error writing to shell:', error);
        // Switch to fallback mode
        this.fallbackMode = true;
        this.shell = null;
        this.emit('output', '\n\x1b[33mSwitched to fallback mode\x1b[0m\n$ ');
        // Retry handling the input in fallback mode
        await this.handleInput(data);
      }
    } else {
      // No shell available, switch to fallback mode
      logger.warn('[TerminalService] No shell available, switching to fallback mode');
      this.fallbackMode = true;
      this.emit('output', '\x1b[33mTerminal in fallback mode\x1b[0m\n$ ');
      // Retry handling the input in fallback mode
      await this.handleInput(data);
    }
  }

  cleanup() {
    if (this.shell && !this.shell.killed) {
      this.shell.kill();
    }
    this.removeAllListeners();
  }
}

class TerminalService {
  constructor() {
    this.sessions = new Map();
  }

  async createSession(userId) {
    const sessionId = uuidv4();
    const baseDir = path.join(process.cwd(), 'app', 'terminal', 'alfred', userId);
    
    const session = new TerminalSession(sessionId, userId, baseDir);
    
    try {
      const initialized = await session.initialize();
      if (!initialized) {
        logger.error('[TerminalService] Session initialization failed');
        // Don't throw - return null to indicate failure
        return null;
      }
      
      this.sessions.set(sessionId, session);
      
      // Auto cleanup after 30 minutes of inactivity
      session.inactivityTimer = setTimeout(() => {
        this.destroySession(sessionId);
      }, 30 * 60 * 1000);

      // Reset timer on activity
      session.on('command', () => {
        clearTimeout(session.inactivityTimer);
        session.inactivityTimer = setTimeout(() => {
          this.destroySession(sessionId);
        }, 30 * 60 * 1000);
      });
      
      return { sessionId, session };
    } catch (error) {
      logger.error('[TerminalService] Error during session creation:', error);
      // Clean up the failed session
      try {
        session.cleanup();
      } catch (cleanupError) {
        logger.error('[TerminalService] Error during cleanup:', cleanupError);
      }
      // Return null instead of throwing to prevent server crash
      return null;
    }
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      clearTimeout(session.inactivityTimer);
      session.cleanup();
      this.sessions.delete(sessionId);
    }
  }

  getAllSessions() {
    return Array.from(this.sessions.keys());
  }

  getSessionsByUser(userId) {
    const userSessions = [];
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        userSessions.push(sessionId);
      }
    }
    return userSessions;
  }
}

module.exports = new TerminalService();