import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { MessageStatusType } from "@/components/chat/message-status";

type Message = {
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
    startTime: Date.now(), // Ensure this is always initialized
  },
};

export function useChat(studentId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chatSession } = useQuery<ChatSession>({
    queryKey: ["/api/chats", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${studentId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Ensure we always have valid metadata with startTime
      const metadata = {
        ...DEFAULT_SESSION.metadata,
        ...(data?.metadata || {}),
        startTime: data?.metadata?.startTime || Date.now(), // Guarantee startTime exists
      };

      return {
        ...DEFAULT_SESSION,
        ...data,
        metadata,
      };
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, context }: { content: string; context?: Message["context"] }) => {
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

      try {
        // Use guaranteed default session if chatSession is undefined
        const currentSession = chatSession || DEFAULT_SESSION;
        const sessionDuration = Math.floor((Date.now() - currentSession.metadata.startTime) / 1000);

        const res = await fetch(`/api/chats/${studentId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            content,
            context: {
              ...context,
              sessionDuration,
            }
          }),
          credentials: "include",
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // Update message status to delivered
        const updatedMessage = { ...optimisticUpdate, status: "delivered" as const };
        return {
          ...data,
          messages: [...(data.messages || []).slice(0, -1), updatedMessage],
        };
      } catch (error) {
        // Revert to previous state and mark message as error
        queryClient.setQueryData<ChatSession>(["/api/chats", studentId], {
          ...previousData!,
          messages: [
            ...(previousData?.messages || []),
            { ...optimisticUpdate, status: "error" as const },
          ],
        });
        throw error;
      }
    },
    onSuccess: (newSession: ChatSession) => {
      // Ensure metadata with startTime when updating cache
      const updatedSession = {
        ...newSession,
        metadata: {
          ...DEFAULT_SESSION.metadata,
          ...newSession.metadata,
        },
      };
      queryClient.setQueryData(["/api/chats", studentId], updatedSession);
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
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
      // Ensure metadata with startTime when updating cache
      const updatedSession = {
        ...newSession,
        metadata: {
          ...DEFAULT_SESSION.metadata,
          ...newSession.metadata,
        },
      };
      queryClient.setQueryData(["/api/chats", studentId], updatedSession);
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
      // Reset with new startTime
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

  // Ensure we always return valid metadata with startTime
  const safeMetadata = chatSession?.metadata || DEFAULT_SESSION.metadata;

  return {
    messages: chatSession?.messages || DEFAULT_SESSION.messages,
    metadata: {
      ...DEFAULT_SESSION.metadata,
      ...safeMetadata,
    },
    sendMessage: (content: string, context?: Message["context"]) => 
      sendMessage.mutateAsync({ content, context }),
    updateLearningStyle: (style: string) => updateLearningStyle.mutate(style),
    isLoading: sendMessage.isPending,
    clearMessages,
  };
}