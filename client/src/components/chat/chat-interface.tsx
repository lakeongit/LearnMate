import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Timer, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { Student } from "@db/schema";

interface ChatInterfaceProps {
  student: Student;
}

export function ChatInterface({ student }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const { messages, sendMessage, isLoading, currentTopic } = useChat(student.id);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && timeLeft > 0) {
      sendMessage(input);
      setInput("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border rounded-lg h-[600px] flex flex-col bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{currentTopic || "General Learning"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-muted-foreground" />
          <span className={`font-medium ${timeLeft < 60 ? 'text-destructive' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <MessageBubble
              key={i}
              content={message.content}
              isUser={message.role === "user"}
            />
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={isLoading || timeLeft <= 0}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || timeLeft <= 0}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}