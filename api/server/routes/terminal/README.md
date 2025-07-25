# Terminal API Documentation

The Terminal API provides a WebSocket-based terminal interface for LibreChat, allowing users to execute commands in a sandboxed environment.

## Features

- WebSocket-based real-time terminal communication
- Sandboxed execution in `/app/terminal/alfred/` directory
- Cross-platform support (Windows/Linux/macOS)
- Command history tracking
- Session management
- Security restrictions with allowed command whitelist

## REST API Endpoints

### Create Terminal Session
```
POST /api/terminal/create
Authorization: Bearer <jwt_token>

Response:
{
  "sessionId": "uuid",
  "baseDir": "/path/to/terminal/alfred/userId",
  "currentDir": "/path/to/terminal/alfred/userId"
}
```

### Get User Sessions
```
GET /api/terminal/sessions
Authorization: Bearer <jwt_token>

Response:
{
  "sessions": ["sessionId1", "sessionId2"]
}
```

### Destroy Session
```
DELETE /api/terminal/session/:sessionId
Authorization: Bearer <jwt_token>

Response:
{
  "message": "Session destroyed"
}
```

### Get Session History
```
GET /api/terminal/history/:sessionId
Authorization: Bearer <jwt_token>

Response:
{
  "history": [
    {
      "type": "command",
      "data": "ls",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "type": "output",
      "data": "file1.txt file2.txt",
      "timestamp": "2024-01-01T00:00:01.000Z"
    }
  ]
}
```

## WebSocket API

### Connection
```
ws://localhost:3080/api/terminal/ws?sessionId=<sessionId>
```

### Message Types

#### Client to Server

**Execute Command**
```json
{
  "type": "command",
  "command": "ls -la"
}
```

**Resize Terminal**
```json
{
  "type": "resize",
  "cols": 80,
  "rows": 24
}
```

**Ping**
```json
{
  "type": "ping"
}
```

#### Server to Client

**Ready**
```json
{
  "type": "ready",
  "sessionId": "uuid",
  "currentDir": "/path/to/current/dir"
}
```

**Command Output**
```json
{
  "type": "output",
  "data": "command output text"
}
```

**Error Output**
```json
{
  "type": "error",
  "data": "error message"
}
```

**Clear Screen**
```json
{
  "type": "clear"
}
```

**Session Exit**
```json
{
  "type": "exit",
  "code": 0
}
```

**Pong Response**
```json
{
  "type": "pong"
}
```

## Allowed Commands

The following commands are allowed for security reasons:
- `ls`, `dir`, `pwd`, `cd`, `echo`, `cat`, `type`
- `mkdir`, `touch`, `rm`, `del`, `cp`, `copy`, `mv`, `move`
- `node`, `npm`, `yarn`
- `git`
- `python`, `pip`
- `clear`, `cls`

## Security Features

1. **Command Whitelisting**: Only allowed commands can be executed
2. **Directory Sandboxing**: Users cannot navigate outside their terminal directory
3. **Session Isolation**: Each user has their own isolated directory
4. **Auto-cleanup**: Sessions are automatically destroyed after 30 minutes of inactivity

## Usage Example

```javascript
// Create a session
const response = await fetch('/api/terminal/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const { sessionId } = await response.json();

// Connect WebSocket
const ws = new WebSocket(`ws://localhost:3080/api/terminal/ws?sessionId=${sessionId}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};

ws.onopen = () => {
  // Execute a command
  ws.send(JSON.stringify({
    type: 'command',
    command: 'ls'
  }));
};
```

## Implementation Notes

Since `node-pty` is not available, this implementation uses:
- `child_process.spawn()` for creating shell sessions
- Platform-specific shells (cmd.exe on Windows, /bin/bash on Unix)
- Command translation for cross-platform compatibility
- Manual session state management

## Limitations

Without `node-pty`:
- No true PTY support (pseudo-terminal)
- Limited terminal control sequences
- No proper resize support
- Some interactive programs may not work correctly
- ANSI color codes may not be properly handled

## Future Improvements

1. Add support for more commands based on security review
2. Implement proper ANSI color code handling
3. Add file upload/download capabilities
4. Implement collaborative terminal sessions
5. Add terminal recording and playback features