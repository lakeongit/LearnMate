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

export function useChat(studentId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chatSession = DEFAULT_SESSION } = useQuery<ChatSession>({
    queryKey: ["/api/chats", studentId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/chats/${studentId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Chat API Error:", res.status, res.statusText);
          const errorText = await res.text();
          throw new Error(errorText);
        }

        const data = await res.json();
        console.log("Chat API Response:", data);

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
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, context }: { content: string; context?: Message["context"] }) => {
      try {
        // Update message status in cache while sending
        const optimisticUpdate: Message = {
          role: "user",
          content,
          status: "sending",
          context,
        };

        const previousData = queryClient.getQueryData<ChatSession>(["/api/chats", studentId]);
        queryClient.setQueryData<ChatSession>(["/api/chats", studentId], old => ({
          ...old!,
          messages: [...(old?.messages || []), optimisticUpdate],
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
          const errorText = await res.text();
          console.error("Send message error:", errorText);
          throw new Error(errorText);
        }

        const data = await res.json();
        console.log("Send message response:", data);

        // Update message status to delivered
        const updatedUserMessage = { ...optimisticUpdate, status: "delivered" as const };
        return {
          messages: [...data.messages],
          metadata: {
            ...DEFAULT_SESSION.metadata,
            ...data.metadata,
          },
        };
      } catch (error) {
        console.error("Send message error:", error);
        // Revert to previous state and mark message as error
        queryClient.setQueryData<ChatSession>(["/api/chats", studentId], previousData => ({
          ...previousData!,
          messages: [
            ...(previousData?.messages || []),
            { ...optimisticUpdate, status: "error" as const },
          ],
        }));
        throw error;
      }
    },
    onSuccess: (newSession: ChatSession) => {
      // Update the cache with both user and assistant messages
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
        description: error.message || "Failed to send message",
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