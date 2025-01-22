import { useEffect, useRef, useCallback } from "react";
import { useToast } from "./use-toast";

interface WebSocketHookOptions {
  userId: number;
  onTypingStatusChange?: (isTyping: boolean) => void;
}

export function useWebSocket({ userId, onTypingStatusChange }: WebSocketHookOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Create WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        reconnectAttempts = 0;
        ws?.send(JSON.stringify({ type: 'register', userId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'typing_status') {
            onTypingStatusChange?.(data.isTyping);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connect, 1000 * Math.min(reconnectAttempts, 5));
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to connect to chat server after multiple attempts.",
            variant: "destructive"
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws?.close();
      };
    };

    connect();

    return () => {
      ws?.close();
    };
  }, [userId, onTypingStatusChange, toast]);

  return {
    // Return the current WebSocket instance
    ws: wsRef.current
  };
}