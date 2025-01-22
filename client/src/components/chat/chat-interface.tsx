import { useState, useEffect, useCallback } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, BookOpen, Bot, User, Timer, Loader2 } from "lucide-react";
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
import { AiTutorExplainer } from "./ai-tutor-explainer";
import { useWebSocket } from "@/hooks/use-websocket";
import { TypingIndicator } from "./typing-indicator";
import { ChatList } from "./chat-list";
import { Progress } from "@/components/ui/progress";

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
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [showTutorExplainer, setShowTutorExplainer] = useState(true);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<Array<{id: number; title: string; updatedAt: string}>>([]);
  const [currentChatId, setCurrentChatId] = useState<number>();
  const [showProgressIndicator, setShowProgressIndicator] = useState(false);
  const [userProgress, setUserProgress] = useState<{
    subject: string;
    mastery: number;
    lastUpdated: string;
  }[]>([]);

  const { 
    messages, 
    sendMessage, 
    isLoading, 
    clearMessages, 
    metadata,
    updateLearningStyle 
  } = useChat(user.id);

  const { toast } = useToast();
  const [studyTimer, setStudyTimer] = useState(0);
  const [userLearningStyle, setUserLearningStyle] = useState(user.learningStyle || 'visual');

  useWebSocket({
    userId: user.id,
    onTypingStatusChange: (isTyping) => setIsAiTyping(isTyping),
  });

  const loadChatList = useCallback(() => {
    fetch(`/api/chats/${user.id}/list`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChats(data);
        } else {
          console.error('Chat list data is not an array:', data);
          setChats([]);
        }
      })
      .catch(error => {
        console.error('Error fetching chat list:', error);
        setChats([]);
      });
  }, [user.id]);

  const loadUserProgress = useCallback(() => {
    fetch(`/api/learning-progress/${user.id}`)
      .then(res => res.json())
      .then(data => setUserProgress(data))
      .catch(error => console.error('Error loading progress:', error));
  }, [user.id]);

  useEffect(() => {
    loadChatList();
    loadUserProgress();
  }, [loadChatList, loadUserProgress]);

  const handleNewChat = async () => {
    try {
      await clearMessages();
      setInput("");
      setCurrentChatId(undefined);
      setSelectedSubject("");
      setSelectedTopic("");
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast({
        title: "Error starting new chat",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleSelectChat = (chatId: number) => {
    setCurrentChatId(chatId);
    setInput("");
    fetch(`/api/chats/${user.id}/${chatId}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          data.messages.forEach((msg: any) => {
            if (msg.role === 'user') {
              sendMessage(msg.content, msg.context);
            }
          });
        }
      })
      .catch(error => {
        console.error('Error loading chat:', error);
        toast({
          title: "Error loading chat",
          description: "Could not load the selected chat",
          variant: "destructive"
        });
      });
  };

  useEffect(() => {
    const sendWelcomeMessage = async () => {
      if (!user?.id || messages.length > 0 || isLoading) return;
      
      const subjects = user.subjects?.length ? user.subjects.join(", ") : "various subjects";
      const welcomeMessage = `Hi ${user.name || 'there'}! 👋 I'm your AI tutor. What would you like to learn about today? I notice you're interested in ${subjects}. Would you like to explore any of these subjects?`;
      
      try {
        await sendMessage(welcomeMessage, {
          learningStyle: userLearningStyle,
          sessionDuration: 0
        });
      } catch (error) {
        console.error('Welcome message error:', error);
      }
    };
    
    const timer = setTimeout(sendWelcomeMessage, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, messages.length, isLoading, sendMessage, userLearningStyle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const currentInput = input;
      setInput("");
      try {
        const progressTimeout = setTimeout(() => setShowProgressIndicator(true), 3000);

        await sendMessage(currentInput, {
          subject: selectedSubject || undefined,
          topic: selectedTopic || undefined,
          learningStyle: userLearningStyle,
          sessionDuration: studyTimer,
          previousProgress: userProgress
            .find(p => p.subject === selectedSubject)
            ?.mastery
        });

        clearTimeout(progressTimeout);
        setShowProgressIndicator(false);

        loadChatList();
        loadUserProgress();
      } catch (error) {
        setInput(currentInput);
        setShowProgressIndicator(false);
        toast({
          title: "Error sending message",
          description: "Please try again later",
          variant: "destructive"
        });
      }
    }
  };

  const filteredMessages = messages?.filter(message => 
    message?.content?.toLowerCase().includes(searchQuery?.toLowerCase() || '')
  );

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

  const adaptLearningStyle = (style: string) => {
    setUserLearningStyle(style);
    updateLearningStyle(style);
  };

  return (
    <div className="border rounded-lg h-[600px] flex bg-card shadow-lg">
      <ChatList
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col">
        {showTutorExplainer && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <AiTutorExplainer onDismiss={() => setShowTutorExplainer(false)} />
          </div>
        )}

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

              {selectedSubject && (
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basics">Basics</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select 
                value={userLearningStyle} 
                onValueChange={adaptLearningStyle}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Learning style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="auditory">Auditory</SelectItem>
                  <SelectItem value="reading">Reading/Writing</SelectItem>
                  <SelectItem value="kinesthetic">Hands-on</SelectItem>
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
                onClick={() => {
                  clearMessages();
                  setInput("");
                  loadChatList();
                }}
                className="text-sm"
              >
                Clear Chat
              </Button>
            </div>
          </div>
        </div>

        <div className="p-2 border-b bg-muted/5">
          <div className="flex items-center gap-4">
            {selectedSubject && userProgress.find(p => p.subject === selectedSubject) && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Current mastery:</span>
                <Progress 
                  value={userProgress.find(p => p.subject === selectedSubject)?.mastery} 
                  className="w-[100px]"
                />
              </div>
            )}
            {showProgressIndicator && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing your question...</span>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 max-w-3xl mx-auto">
            {filteredMessages?.map((message, i) => (
              <div key={i} className="flex items-start gap-3">
                {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary mt-1" />}
                {message.role === 'user' && <User className="h-6 w-6 text-muted-foreground mt-1" />}
                <MessageBubble
                  content={message.content || ''}
                  isUser={message.role === 'user'}
                  context={message.context}
                  status={message.status}
                  isLoading={i === messages.length - 1 && isLoading && message.role === 'user'}
                  className={message.role === 'user' ? 'bg-primary/10' : 'bg-muted'}
                />
              </div>
            ))}
            {isAiTyping && (
              <div className="flex items-start gap-3">
                <Bot className="h-6 w-6 text-primary mt-1" />
                <TypingIndicator visible={true} />
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedSubject
                    ? `Ask about ${selectedSubject.toLowerCase()}${
                        selectedTopic ? ` (${selectedTopic})` : ''
                      }...`
                    : "Ask your AI tutor anything..."
                }
                disabled={isLoading}
                className="flex-1 bg-muted/50"
              />
              <Button type="submit" disabled={isLoading} size="icon">
                {isLoading ? (
                  <span className="animate-spin">⌛</span>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {selectedSubject && !input && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInput(`Can you explain the basic concepts of ${selectedSubject}?`)}
                  className="text-xs"
                >
                  ✨ Basic concepts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInput(`Give me some practice problems for ${selectedSubject}.`)}
                  className="text-xs"
                >
                  📝 Practice problems
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInput(`What are some real-world applications of ${selectedSubject}?`)}
                  className="text-xs"
                >
                  🌍 Real-world examples
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}