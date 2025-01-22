
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ChatListProps {
  chats: Array<{
    id: number;
    title: string;
    updatedAt: string;
  }>;
  currentChatId?: number;
  onSelectChat: (chatId: number) => void;
  onNewChat: () => void;
}

export function ChatList({ chats, currentChatId, onSelectChat, onNewChat }: ChatListProps) {
  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      <div className="p-4 border-b">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chats.map((chat) => (
            <Button
              key={chat.id}
              variant={currentChatId === chat.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 h-auto py-3"
              onClick={() => onSelectChat(chat.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <div className="truncate text-left">
                <div className="text-sm font-medium truncate">{chat.title}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(chat.updatedAt), 'MMM d, yyyy')}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
