import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
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

  const { data: chatSession } = useQuery<ChatSession>({
    queryKey: ["/api/chats", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${studentId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return {
        ...DEFAULT_SESSION,
        ...data,
        metadata: {
          ...DEFAULT_SESSION.metadata,
          ...(data?.metadata || {}),
        },
      };
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, context }: { content: string; context?: Message["context"] }) => {
      const currentSession = chatSession || DEFAULT_SESSION;
      const sessionDuration = currentSession.metadata.startTime 
        ? Math.floor((Date.now() - currentSession.metadata.startTime) / 1000)
        : 0;

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
      return res.json();
    },
    onSuccess: (newSession: ChatSession) => {
      queryClient.setQueryData(["/api/chats", studentId], newSession);
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
      queryClient.setQueryData(["/api/chats", studentId], newSession);
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
    messages: chatSession?.messages || DEFAULT_SESSION.messages,
    metadata: chatSession?.metadata || DEFAULT_SESSION.metadata,
    sendMessage: (content: string, context?: Message["context"]) => 
      sendMessage.mutate({ content, context }),
    updateLearningStyle: (style: string) => updateLearningStyle.mutate(style),
    isLoading: sendMessage.isPending,
    clearMessages,
  };
}