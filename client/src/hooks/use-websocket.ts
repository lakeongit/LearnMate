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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const connectWebSocket = () => {
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      // Register user with WebSocket server
      ws.send(JSON.stringify({ 
        type: 'register', 
        userId 
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'typing_status') {
          onTypingStatusChange?.(data.isTyping);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Attempting to reconnect to chat server...",
        variant: "destructive"
      });
      setTimeout(connectWebSocket, 3000);
    };

    ws.onclose = () => {
      console.log('WebSocket closed, attempting to reconnect...');
      setTimeout(connectWebSocket, 3000);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    };

    connectWebSocket();
  }, [userId, onTypingStatusChange, toast]);

  return {
    // Return the current WebSocket instance
    ws: wsRef.current
  };
}
