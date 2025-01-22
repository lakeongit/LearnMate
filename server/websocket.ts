import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { logError, ErrorSeverity } from "./error-logging";

interface TypingStatus {
  userId: number;
  isTyping: boolean;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    // Skip vite HMR requests
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') return;
    
    // Only handle /ws path
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const clients = new Map<number, WebSocket[]>();
  const PING_INTERVAL = 30000; // 30 seconds
  
  // Implement connection cleanup
  function cleanupConnection(userId: number, ws: WebSocket) {
    const userConnections = clients.get(userId) || [];
    const updatedConnections = userConnections.filter(conn => conn !== ws);
    
    if (updatedConnections.length === 0) {
      clients.delete(userId);
    } else {
      clients.set(userId, updatedConnections);
    }
  }
  
  // Keep-alive ping
  setInterval(() => {
    clients.forEach((connections, userId) => {
      connections.forEach((ws, index) => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          cleanupConnection(userId, ws);
        }
      });
    });
  }, PING_INTERVAL);

  wss.on('connection', (ws: WebSocket) => {
    let userId: number;
    let pingTimeout: NodeJS.Timeout;

    const heartbeat = () => {
      clearTimeout(pingTimeout);
      pingTimeout = setTimeout(() => {
        ws.terminate();
      }, 60000);
    };

    ws.on('ping', heartbeat);
    ws.on('pong', heartbeat);
    heartbeat();

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);

        if (message.type === 'register' && typeof message.userId === 'number') {
          userId = message.userId;
          if (!clients.has(userId)) {
            clients.set(userId, []);
          }
          clients.get(userId)!.push(ws);
        }
      } catch (error: any) {
        logError(error, ErrorSeverity.ERROR, {
          action: 'websocket_message_parse',
          error: error.message
        });
      }
    });

    ws.on('close', () => {
      if (userId && clients.has(userId)) {
        clients.set(
          userId,
          clients.get(userId)!.filter(client => client !== ws)
        );
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