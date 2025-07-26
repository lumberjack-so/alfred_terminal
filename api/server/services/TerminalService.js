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
  'git', 'python', 'pip', 'clear', 'cls'
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
  }

  async initialize() {
    try {
      // Ensure base directory exists
      logger.info(`[TerminalService] Creating directory: ${this.baseDir}`);
      await fs.mkdir(this.baseDir, { recursive: true });
      
      // Verify directory was created
      const stats = await fs.stat(this.baseDir);
      if (!stats.isDirectory()) {
        throw new Error('Failed to create base directory');
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
        // Use /bin/sh for Alpine Linux compatibility
        const shellPath = process.env.SHELL || '/bin/sh';
        logger.info(`[TerminalService] Using shell: ${shellPath}`);
        
        try {
          this.shell = spawn(shellPath, ['-i'], {
            cwd: this.currentDir,
            env: { ...process.env, PS1: '\\w$ ', TERM: 'xterm-256color' },
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch (spawnError) {
          logger.error('[TerminalService] Failed to spawn shell:', spawnError);
          this.emit('error', `Failed to start terminal: ${spawnError.message}`);
          return false;
        }
      }

      // Check if shell was created successfully
      if (!this.shell || !this.shell.pid) {
        logger.error('[TerminalService] Shell process failed to start');
        this.emit('error', 'Failed to start terminal shell');
        return false;
      }

      this.setupShellHandlers();
      
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
      return;
    }

    // Convert command if on Windows
    const actualCommand = this.isWindows && WINDOWS_COMMAND_MAP[cmd] 
      ? trimmedCommand.replace(cmd, WINDOWS_COMMAND_MAP[cmd])
      : trimmedCommand;

    // Execute command
    if (this.shell && !this.shell.killed) {
      this.shell.stdin.write(actualCommand + '\n');
    } else {
      // Fallback to exec if shell is not available
      this.executeWithExec(actualCommand);
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
    } catch (error) {
      this.emit('error', `Cannot change directory: ${error.message}\n`);
    }
  }

  executeWithExec(command) {
    exec(command, { 
      cwd: this.currentDir,
      maxBuffer: 1024 * 1024 // 1MB buffer
    }, (error, stdout, stderr) => {
      if (error) {
        this.emit('error', `Error: ${error.message}\n`);
        return;
      }
      if (stdout) {
        this.emit('output', stdout);
      }
      if (stderr) {
        this.emit('error', stderr);
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