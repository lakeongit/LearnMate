import { useEffect, useRef, useCallback } from "react";
import { useToast } from "./use-toast";

interface WebSocketHookOptions {
  userId: number;
  onTypingStatusChange?: (isTyping: boolean) => void;
}

interface WebSocketMessage {
  type: 'register' | 'message' | 'typing_status';
  userId?: number;
  content?: string;
  isTyping?: boolean;
}

export function useWebSocket({ userId, onTypingStatusChange }: WebSocketHookOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const connect = useCallback(() => {
    try {
      // Clear any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Register user immediately after connection
        const message: WebSocketMessage = { type: 'register', userId };
        ws.send(JSON.stringify(message));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          if (data.type === 'typing_status' && typeof data.isTyping === 'boolean') {
            onTypingStatusChange?.(data.isTyping);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
          toast({
            title: "Connection Error",
            description: "Failed to process server message",
            variant: "destructive"
          });
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Clear the current connection
        wsRef.current = null;

        // Attempt to reconnect after a delay (exponential backoff could be implemented here)
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Chat connection error. Reconnecting...",
          variant: "destructive"
        });
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish chat connection",
        variant: "destructive"
      });
    }
  }, [userId, onTypingStatusChange, toast]);

  useEffect(() => {
    connect();
    return () => {
      // Clean up WebSocket connection and any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'message',
        content,
        userId
      };
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [userId]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}