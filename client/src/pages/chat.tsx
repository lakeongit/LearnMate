import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['/api/chat/messages'],
    queryFn: async () => {
      const response = await fetch('/api/chat/messages');
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json() as Promise<Message[]>;
    }
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      setInput("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage.mutate(input);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 h-screen flex flex-col">
      <Card className="flex-1 p-4 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 mb-4 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <span className="text-xs">AI</span>
                </Avatar>
              )}
              <div
                className={`px-4 py-2 rounded-lg max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <span className="text-xs">You</span>
                </Avatar>
              )}
            </div>
          ))}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={sendMessage.isPending}
          />
          <Button type="submit" disabled={sendMessage.isPending}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}