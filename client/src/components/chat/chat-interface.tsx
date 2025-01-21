
import { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, BookOpen, Bot, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@db/schema";

interface ChatInterfaceProps {
  user: UserType;
}

export function ChatInterface({ user }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading, clearMessages } = useChat(user.id);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      try {
        await sendMessage(input);
        setInput("");
      } catch (error) {
        toast({
          title: "Error sending message",
          description: "Please try logging out and back in",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="border rounded-lg h-[600px] flex flex-col bg-card shadow-lg">
      <div className="p-4 border-b flex items-center justify-between bg-primary/5">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">AI Tutor Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMessages()}
              className="text-sm"
            >
              Clear Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearMessages();
                setInput("");
              }}
              className="text-sm"
            >
              New Chat
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((message, i) => (
            <div key={i} className="flex items-start gap-3">
              {!message.isUser && <Bot className="h-6 w-6 text-primary mt-1" />}
              {message.isUser && <User className="h-6 w-6 text-muted-foreground mt-1" />}
              <MessageBubble
                content={message.content}
                isUser={message.role === "user"}
                isTyping={i === messages.length - 1 && isLoading && !message.isUser}
                shouldGroup={i > 0 && messages[i - 1].role === message.role}
              />
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI tutor anything..."
          disabled={isLoading}
          className="flex-1 bg-muted/50"
        />
        <Button type="submit" disabled={isLoading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
