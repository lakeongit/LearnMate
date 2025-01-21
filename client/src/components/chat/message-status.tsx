import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageStatusType = "sending" | "sent" | "delivered" | "seen" | "error";

interface MessageStatusProps {
  status: MessageStatusType;
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center text-xs transition-opacity", 
        status === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {status === "sending" && (
        <Clock className="h-3 w-3 animate-pulse" />
      )}
      {status === "sent" && (
        <Check className="h-3 w-3" />
      )}
      {status === "delivered" && (
        <CheckCheck className="h-3 w-3" />
      )}
      {status === "seen" && (
        <CheckCheck className="h-3 w-3 text-primary" />
      )}
      {status === "error" && (
        <span className="text-[10px]">Failed to send</span>
      )}
    </span>
  );
}
