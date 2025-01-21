import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Loader2 } from "lucide-react";
import { MessageStatus } from "./message-status";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  isLoading?: boolean;
  context?: {
    subject?: string;
    topic?: string;
    learningStyle?: string;
    sessionDuration?: number;
  };
  className?: string;
  status?: "sending" | "sent" | "delivered" | "seen" | "error";
}

export function MessageBubble({ 
  content, 
  isUser, 
  isLoading, 
  context, 
  className,
  status 
}: MessageBubbleProps) {
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
        <div className="space-y-3">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            {content.split('\n').map((paragraph, index) => {
              // Handle headers
              if (paragraph.startsWith('###')) {
                return (
                  <h3 key={index} className="text-lg font-bold text-primary mt-6 first:mt-0">
                    {paragraph.replace('###', '').trim()}
                  </h3>
                );
              }
              
              // Handle subheaders
              if (paragraph.startsWith('####')) {
                return (
                  <h4 key={index} className="text-md font-semibold text-primary/80 mt-4">
                    {paragraph.replace('####', '').trim()}
                  </h4>
                );
              }

              // Handle code blocks
              if (paragraph.startsWith('```')) {
                const language = paragraph.split('\n')[0].replace('```', '');
                const code = paragraph
                  .split('\n')
                  .slice(1, -1)
                  .join('\n');
                return (
                  <div key={index} className="bg-muted/30 rounded-md p-4 my-4">
                    <pre className="text-sm overflow-x-auto">
                      <code>{code}</code>
                    </pre>
                  </div>
                );
              }

              // Handle bullet points
              if (paragraph.startsWith('- ')) {
                return (
                  <li key={index} className="text-sm leading-relaxed ml-4">
                    {paragraph.substring(2)}
                  </li>
                );
              }

              // Handle source links
              if (paragraph.startsWith('[') && paragraph.includes(']:')) {
                const [ref, link] = paragraph.split(']: ');
                return (
                  <a 
                    key={index}
                    href={link}
                    className="text-sm text-primary hover:underline block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ref.replace('[', '').replace(']', '')}
                  </a>
                );
              }

              // Regular paragraphs
              return (
                <p key={index} className="text-sm leading-relaxed">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {!isUser && context && Object.keys(context).length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              {context.subject && (
                <span className="mr-2">
                  Subject: {context.subject}
                </span>
              )}
              {context.topic && (
                <span className="mr-2">
                  Topic: {context.topic}
                </span>
              )}
              {context.learningStyle && (
                <span className="mr-2">
                  Style: {context.learningStyle}
                </span>
              )}
            </div>
          )}

          {isUser && status && (
            <div className="flex justify-end mt-1">
              <MessageStatus 
                status={status} 
                className={cn(
                  "opacity-75",
                  status === "error" ? "text-destructive" : "text-primary-foreground"
                )}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}