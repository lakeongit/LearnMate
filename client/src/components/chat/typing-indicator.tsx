import { Loader2 } from "lucide-react";

interface TypingIndicatorProps {
  visible: boolean;
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-muted-foreground">
      <span>AI Tutor is typing</span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
      </div>
    </div>
  );
}