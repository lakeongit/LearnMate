import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface TooltipWrapperProps {
  content: string | React.ReactNode;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export function TooltipWrapper({ content, children, showIcon = true }: TooltipWrapperProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {children}
            {showIcon && <HelpCircle className="h-4 w-4 text-muted-foreground" />}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
