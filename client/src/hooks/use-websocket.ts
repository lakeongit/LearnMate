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
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
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

    ws.onerror = () => {
      toast({
        title: "Connection Error",
        description: "There was an error connecting to the chat server",
        variant: "destructive"
      });
    };

    return () => {
      ws.close();
    };
  }, [userId, onTypingStatusChange, toast]);

  return {
    // Return the current WebSocket instance
    ws: wsRef.current
  };
}
