import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { MessageStatusType } from "@/components/chat/message-status";

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

type ChatSession = {
  messages: Message[];
  metadata: {
    subject?: string;
    topic?: string;
    learningStyle: string;
    startTime: number;
    endTime?: number;
    mastery?: number;
  };
};

const DEFAULT_SESSION: ChatSession = {
  messages: [],
  metadata: {
    learningStyle: 'visual',
    startTime: Date.now(),
  },
};

let welcomeMessageSent = false;

export function useChat(studentId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

        // Reset welcome message flag when loading a new session
        if (!data.messages?.length) {
          welcomeMessageSent = false;
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
    onSuccess: (newSession: ChatSession) => {
      queryClient.setQueryData<ChatSession>(["/api/chats", studentId], {
        ...newSession,
        metadata: {
          ...DEFAULT_SESSION.metadata,
          ...newSession.metadata,
        },
      });
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
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
      welcomeMessageSent = false;
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

  const clearMessages = () => {
    endSession.mutate();
  };

  // Only send welcome message once when no messages exist
  const shouldSendWelcome = !welcomeMessageSent && (!chatSession.messages || chatSession.messages.length === 0);
  if (shouldSendWelcome && !isError) {
    welcomeMessageSent = true;
    return {
      messages: [],
      metadata: chatSession.metadata,
      sendMessage,
      updateLearningStyle,
      isLoading: false,
      clearMessages,
    };
  }

  return {
    messages: chatSession.messages,
    metadata: chatSession.metadata,
    sendMessage: (content: string, context?: Message["context"]) => 
      sendMessage.mutateAsync({ content, context }),
    updateLearningStyle: (style: string) => updateLearningStyle.mutate(style),
    isLoading: sendMessage.isPending,
    clearMessages,
  };
}