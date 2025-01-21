import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  isLoading?: boolean;
  className?: string;
}

export function MessageBubble({ content, isUser, isLoading, className }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3",
        isUser
          ? "bg-primary text-primary-foreground ml-auto"
          : "bg-muted/60 text-foreground",
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed mb-2 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}