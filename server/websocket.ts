import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { logError, ErrorSeverity } from "./error-logging";

interface TypingStatus {
  userId: number;
  isTyping: boolean;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,  // Attach directly to HTTP server
    path: '/ws'
  });

  const clients = new Map<number, Set<WebSocket>>();
  const PING_INTERVAL = 30000; // 30 seconds

  // Keep-alive ping
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, PING_INTERVAL);

  wss.on('connection', (ws: WebSocket, request) => {
    let userId: number | undefined;

    // Set up heartbeat
    let pingTimeout: NodeJS.Timeout;
    const heartbeat = () => {
      clearTimeout(pingTimeout);
      pingTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, PING_INTERVAL + 5000); // Give extra time before closing
    };

    ws.on('ping', heartbeat);
    ws.on('pong', heartbeat);
    heartbeat();

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'register' && typeof message.userId === 'number') {
          userId = message.userId;
          if (!clients.has(userId)) {
            clients.set(userId, new Set());
          }
          clients.get(userId)!.add(ws);

          // Send immediate confirmation
          ws.send(JSON.stringify({ type: 'registered', userId }));
        }
      } catch (error) {
        logError(error, ErrorSeverity.ERROR, {
          action: 'websocket_message_parse',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Send error back to client
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });

    ws.on('error', (error) => {
      logError(error, ErrorSeverity.ERROR, {
        action: 'websocket_error',
        userId,
        error: error.message
      });
    });

    ws.on('close', () => {
      clearTimeout(pingTimeout);
      if (userId && clients.has(userId)) {
        const userClients = clients.get(userId)!;
        userClients.delete(ws);
        if (userClients.size === 0) {
          clients.delete(userId);
        }
      }
    });
  });

  // Function to broadcast typing status to all clients for a user
  const broadcastTypingStatus = (userId: number, isTyping: boolean) => {
    const userClients = clients.get(userId);
    if (!userClients) return;

    const message = JSON.stringify({
      type: 'typing_status',
      isTyping
    });

    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  return {
    broadcastTypingStatus
  };
}