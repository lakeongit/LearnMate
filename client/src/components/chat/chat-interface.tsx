import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Timer, Coffee, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { TooltipWrapper } from "@/components/ui/tooltip-wrapper";
import { AiTutorExplainer } from "./ai-tutor-explainer";
import { TimerSettings } from "./timer-settings";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@db/schema";

interface ChatInterfaceProps {
  student: Student;
}

export function ChatInterface({ student }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [sessionDuration, setSessionDuration] = useState(25); // Default 25 minutes
  const [breakInterval, setBreakInterval] = useState(25); // Default break every 25 minutes
  const [breakDuration, setBreakDuration] = useState(5); // Default 5 minute breaks
  const [breakReminders, setBreakReminders] = useState(true);
  const [timeLeft, setTimeLeft] = useState(sessionDuration * 60);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showExplainer, setShowExplainer] = useState(true);
  const { messages, sendMessage, isLoading } = useChat(student.id);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = () => {
      const settings = localStorage.getItem(`timer-settings-${student.id}`);
      if (settings) {
        const { duration, breakInterval, breakDuration, breakReminders } = JSON.parse(settings);
        setSessionDuration(duration);
        setBreakInterval(breakInterval);
        setBreakDuration(breakDuration);
        setBreakReminders(breakReminders);
        setTimeLeft(duration * 60);
      }
    };

    loadSettings();
  }, [student.id]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;

          // Check for break time
          if (breakReminders && !isOnBreak && 
              (sessionDuration * 60 - newTime) > 0 && 
              (sessionDuration * 60 - newTime) % (breakInterval * 60) === 0) {
            setIsOnBreak(true);
            setTimeLeft(breakDuration * 60);
            toast({
              title: "Time for a Break!",
              description: `Take a ${breakDuration} minute break to stay fresh and focused.`,
              duration: 8000,
            });
            return breakDuration * 60;
          }

          // Break finished
          if (isOnBreak && newTime === 0) {
            setIsOnBreak(false);
            toast({
              title: "Break Time Over",
              description: "Let's get back to learning!",
              duration: 5000,
            });
            return sessionDuration * 60;
          }

          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, breakReminders, breakInterval, breakDuration, sessionDuration, isOnBreak, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && timeLeft > 0 && !isOnBreak) {
      sendMessage(input);
      setInput("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSettingsChange = (
    duration: number,
    breakInt: number,
    breakDur: number,
    reminders: boolean
  ) => {
    setSessionDuration(duration);
    setBreakInterval(breakInt);
    setBreakDuration(breakDur);
    setBreakReminders(reminders);
    setTimeLeft(duration * 60);
    setIsOnBreak(false);

    // Save settings to localStorage
    localStorage.setItem(`timer-settings-${student.id}`, JSON.stringify({
      duration,
      breakInterval: breakInt,
      breakDuration: breakDur,
      breakReminders: reminders,
    }));
  };

  if (showExplainer) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <AiTutorExplainer onDismiss={() => setShowExplainer(false)} />
      </div>
    );
  }

  return (
    <div className="border rounded-lg h-[600px] flex flex-col bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <TooltipWrapper
          content="Current topic or subject being discussed"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">General Learning</span>
          </div>
        </TooltipWrapper>

        <div className="flex items-center gap-4">
          <TooltipWrapper
            content={isOnBreak ? "Break time remaining" : "Study session timer"}
          >
            <div className="flex items-center gap-2">
              {isOnBreak ? (
                <Coffee className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Timer className="h-5 w-5 text-muted-foreground" />
              )}
              <span className={`font-medium ${timeLeft < 60 ? 'text-destructive' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </TooltipWrapper>

          <TimerSettings
            duration={sessionDuration}
            onDurationChange={(d) => handleSettingsChange(d, breakInterval, breakDuration, breakReminders)}
            breakInterval={breakInterval}
            onBreakIntervalChange={(i) => handleSettingsChange(sessionDuration, i, breakDuration, breakReminders)}
            breakDuration={breakDuration}
            onBreakDurationChange={(d) => handleSettingsChange(sessionDuration, breakInterval, d, breakReminders)}
            breakReminders={breakReminders}
            onBreakRemindersChange={(r) => handleSettingsChange(sessionDuration, breakInterval, breakDuration, r)}
          />
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
        <TooltipWrapper
          content={isOnBreak 
            ? "Take a break and return refreshed!" 
            : "Ask any question about your studies. Your AI tutor will help you understand!"}
          showIcon={false}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isOnBreak ? "Currently on break..." : "Ask me anything..."}
            disabled={isLoading || timeLeft <= 0 || isOnBreak}
            className="flex-1"
          />
        </TooltipWrapper>

        <TooltipWrapper
          content="Send your question to get help"
          showIcon={false}
        >
          <Button type="submit" disabled={isLoading || timeLeft <= 0 || isOnBreak}>
            <Send className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      </form>
    </div>
  );
}