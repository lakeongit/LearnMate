import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { MessageStatusType } from "@/components/chat/message-status";
import type { ChatSession } from "@db/schema";
import React from 'react';

type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  status?: MessageStatusType;
  context?: {
    subject?: string;
    topic?: string;
    learningStyle?: string;
    sessionDuration?: number;
  };
};

const DEFAULT_SESSION = {
  messages: [],
  metadata: {
    learningStyle: 'visual',
    startTime: Date.now(),
  },
  isTestEnvironment: process.env.NODE_ENV === 'test',
};

export function useChat(studentId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Track if welcome message has been sent in the current session
  const welcomeMessageRef = React.useRef(false);

  const { data: chatSession = DEFAULT_SESSION, isError } = useQuery<ChatSession>({
    queryKey: ["/api/chats", studentId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/chats/${studentId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = await res.json();

        // Reset welcome message ref when loading a new session
        if (!data.messages?.length) {
          welcomeMessageRef.current = false;
        }

        return {
          messages: data.messages || [],
          metadata: {
            ...DEFAULT_SESSION.metadata,
            ...(data?.metadata || {}),
            startTime: data?.metadata?.startTime || Date.now(),
          },
        };
      } catch (error) {
        console.error("Chat API Error:", error);
        throw error;
      }
    },
    retry: false,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, context }: { content: string; context?: Message["context"] }) => {
      try {
        const optimisticMessage: Message = {
          role: "user",
          content,
          status: "sending",
          context,
        };

        // Store previous state for rollback
        const previousData = queryClient.getQueryData<ChatSession>(["/api/chats", studentId]);

        // Optimistically update UI
        queryClient.setQueryData<ChatSession>(["/api/chats", studentId], old => ({
          ...old!,
          messages: [...(old?.messages || []), optimisticMessage],
        }));

        const res = await fetch(`/api/chats/${studentId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            content,
            context: {
              ...context,
              sessionDuration: Math.floor((Date.now() - chatSession.metadata.startTime) / 1000),
            }
          }),
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = await res.json();

        // Update message status to delivered
        const updatedMessages = data.messages.map((msg: Message) => ({
          ...msg,
          status: msg.role === 'user' ? 'delivered' : msg.status,
        }));

        return {
          messages: updatedMessages,
          metadata: {
            ...DEFAULT_SESSION.metadata,
            ...data.metadata,
          },
        };
      } catch (error) {
        // Revert to previous state on error
        queryClient.setQueryData<ChatSession>(["/api/chats", studentId], old => ({
          ...old!,
          messages: [
            ...(old?.messages || []).slice(0, -1),
            { role: 'user', content, status: 'error' as const },
          ],
        }));
        throw error;
      }
    },
  });

  const updateLearningStyle = useMutation({
    mutationFn: async (learningStyle: string) => {
      const res = await fetch(`/api/chats/${studentId}/learning-style`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningStyle }),
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (newSession: ChatSession) => {
      queryClient.setQueryData(["/api/chats", studentId], {
        ...newSession,
        metadata: {
          ...DEFAULT_SESSION.metadata,
          ...newSession.metadata,
        },
      });
      toast({
        title: "Learning style updated",
        description: "The AI tutor will adapt to your learning preferences.",
      });
    },
  });

  const endSession = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chats/${studentId}/end-session`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());
      welcomeMessageRef.current = false;
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/chats", studentId], {
        ...DEFAULT_SESSION,
        metadata: {
          ...DEFAULT_SESSION.metadata,
          startTime: Date.now(),
        },
      });
    },
  });

  const clearMessages = async () => {
    return endSession.mutateAsync();
  };

  // Send welcome message only once when no messages exist and not in error state
  const shouldSendWelcome = !welcomeMessageRef.current && (!chatSession.messages || chatSession.messages.length === 0);
  if (shouldSendWelcome && !isError) {
    welcomeMessageRef.current = true;
    return {
      messages: [],
      metadata: chatSession.metadata,
      sendMessage: sendMessage.mutateAsync,
      updateLearningStyle: updateLearningStyle.mutate,
      isLoading: false,
      clearMessages,
    };
  }

  return {
    messages: chatSession.messages,
    metadata: chatSession.metadata,
    sendMessage: sendMessage.mutateAsync,
    updateLearningStyle: updateLearningStyle.mutate,
    isLoading: sendMessage.isPending,
    clearMessages,
  };
}