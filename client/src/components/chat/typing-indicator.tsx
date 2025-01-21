import { Loader2 } from "lucide-react";

interface TypingIndicatorProps {
  visible: boolean;
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground animate-in slide-in-from-left-5">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">AI Tutor is typing...</span>
    </div>
  );
}
