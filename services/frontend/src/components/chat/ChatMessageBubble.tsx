import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check } from "lucide-react";
import { ChatMessage } from "../../types";
import { SourceViewer } from "../SourceViewer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ChatMessageBubbleProps {
  msg: ChatMessage;
}

export const ChatMessageBubble = memo(({ msg }: ChatMessageBubbleProps) => {
  const isUser = msg.role === "user";
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    toast({ description: "Message copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`
        group flex gap-4 w-full mb-6 px-2 pt-3
        ${isUser ? "justify-end" : "justify-start"} 
        animate-in fade-in slide-in-from-bottom-2 duration-300
      `}
    >
      <div
        className={`
          relative flex flex-col max-w-[85%] lg:max-w-[75%] 
          ${isUser ? "items-end" : "items-start"}
        `}
      >
        {/* Name Label (Optional, for context) */}
        {/* <span className="text-[10px] text-muted-foreground mb-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isUser ? "You" : "AIRBud 2.0"}
        </span> */}

        {/* The Liquid Bubble */}
        <div
          className={`
            relative px-4 py-3.5 text-sm md:text-base shadow-sm border
            ${isUser
              ? "bg-primary/80 text-primary-foreground rounded-2xl border-primary/20"
              : "text-foreground rounded-2xl border-white/10"
            }
          `}
        >
          {/* Copy Button (Visible on Hover) */}
          <div
            className={`absolute ${isUser ? "-left-10" : "-right-10"} top-2 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/10"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-code:bg-black/20 prose-code:rounded prose-code:px-1 prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="mb-3 last:mb-0" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />
                ),
                li: ({ node, ...props }) => <li className="" {...props} />,
                strong: ({ node, ...props }) => (
                  <span className="font-bold" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="underline font-medium text-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="px-1 py-0.5 rounded font-mono text-sm bg-muted text-foreground"
                    {...props}
                  />
                ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="p-4 rounded-lg overflow-x-auto my-3 bg-muted text-foreground border"
                    {...props}
                  />
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Source Viewer (Attached below AI responses) */}
        {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 w-full max-w-5xl animate-in fade-in duration-500 delay-150">
            <SourceViewer sources={msg.sources} documents={[]} />
          </div>
        )}
      </div>

      {/* User Avatar (Right) */}
      {/* {isUser && (
        <div className="flex-shrink-0 flex flex-col justify-end">
          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg backdrop-blur-md">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      )} */}
    </div>
  );
});

ChatMessageBubble.displayName = "ChatMessageBubble";
