import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "./use-toast";

interface WebSocketHookOptions {
  userId: number;
  onTypingStatusChange?: (isTyping: boolean) => void;
}

interface WebSocketMessage {
  type: string;
  userId?: number;
  content?: string;
  isTyping?: boolean;
  message?: string;
}

const RECONNECT_INTERVAL = 3000;
const MAX_RETRIES = 5;

export function useWebSocket({ userId, onTypingStatusChange }: WebSocketHookOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setRetryCount(0); // Reset retry count on successful connection
        clearTimeout(reconnectTimeoutRef.current); // Clear any pending reconnection attempts
        ws.send(JSON.stringify({ type: 'register', userId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;

          switch (data.type) {
            case 'typing_status':
              if (typeof data.isTyping === 'boolean') {
                onTypingStatusChange?.(data.isTyping);
              }
              break;
            case 'error':
              console.error('WebSocket error:', data.message);
              toast({
                title: "Chat Error",
                description: data.message || "An error occurred",
                variant: "destructive"
              });
              break;
            case 'registered':
              console.log('Successfully registered with chat server');
              break;
            default:
              console.log("Unhandled message type:", data.type);
              break;
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
          // Consider more robust handling of parsing errors, perhaps retrying or disconnecting
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event);
        wsRef.current = null;

        if (retryCount < MAX_RETRIES) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount(count => count + 1);
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          toast({
            title: "Connection Lost",
            description: "Unable to connect to chat server. Please refresh the page.",
            variant: "destructive"
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Let onclose handle reconnection
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server",
        variant: "destructive"
      });
    }
  }, [userId, onTypingStatusChange, toast, retryCount]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content,
        userId
      }));
      return true;
    }
    toast({
      title: "Connection Error",
      description: "Not connected to chat server. Attempting to reconnect...",
      variant: "destructive"
    });
    connect(); // Try to reconnect
    return false;
  }, [userId, connect, toast]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}