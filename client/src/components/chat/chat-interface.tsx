import { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, BookOpen, Bot, User, Timer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatInterfaceProps {
  user: UserType;
}

const subjects = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
] as const;

export function ChatInterface({ user }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const { messages, sendMessage, isLoading, clearMessages } = useChat(user.id);
  const { toast } = useToast();
  const [studyTimer, setStudyTimer] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const messageWithContext = selectedSubject 
        ? `[${selectedSubject}] ${input}`
        : input;

      try {
        await sendMessage(messageWithContext);
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

  // Start a timed study session
  const startStudySession = (minutes: number) => {
    setStudyTimer(minutes * 60);
    const interval = setInterval(() => {
      setStudyTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast({
            title: "Study Session Complete!",
            description: "Take a short break before continuing.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="border rounded-lg h-[600px] flex flex-col bg-card shadow-lg">
      <div className="p-4 border-b flex items-center justify-between bg-primary/5">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">AI Tutor Chat</span>
          </div>
          <div className="flex items-center gap-4">
            {studyTimer > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4" />
                <span>
                  {Math.floor(studyTimer / 60)}:
                  {(studyTimer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startStudySession(10)}
              className="text-sm"
            >
              Start 10min Session
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMessages()}
              className="text-sm"
            >
              Clear Chat
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((message, i) => (
            <div key={i} className="flex items-start gap-3">
              {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary mt-1" />}
              {message.role === 'user' && <User className="h-6 w-6 text-muted-foreground mt-1" />}
              <MessageBubble
                content={message.content}
                isUser={message.role === 'user'}
                isLoading={i === messages.length - 1 && isLoading && message.role === 'assistant'}
                className={message.role === 'user' ? 'bg-primary/10' : 'bg-muted'}
              />
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedSubject 
            ? `Ask about ${selectedSubject.toLowerCase()}...`
            : "Ask your AI tutor anything..."}
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