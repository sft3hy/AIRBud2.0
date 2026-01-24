import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentPreviewModalProps {
  content: string | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  content,
  onClose,
}) => {
  // Prevent scrolling on the body when modal is open
  useEffect(() => {
    if (content) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [content]);

  // Keyboard listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (content === null) return null;

  // Render via Portal to document.body to ensure full-screen coverage
  return createPortal(
    <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      {/* Close Button */}
      <Button
        size="icon"
        onClick={onClose}
        className="absolute top-6 right-6 z-50 h-12 w-12 rounded-full bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 transition-all shadow-lg"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Content Container */}
      <div className="w-full h-full max-w-5xl bg-card border shadow-2xl rounded-xl overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm uppercase tracking-wide">
            File Preview
          </span>
          <span className="ml-auto text-xs text-muted-foreground mr-12 hidden md:block">
            Press ESC to close
          </span>
        </div>

        {/* Markdown Viewer */}
        <ScrollArea className="flex-1 p-6 md:p-12">
          <div className="prose dark:prose-invert max-w-none prose-sm md:prose-base leading-relaxed">
            <ReactMarkdown
              components={{
                table: ({ node, ...props }) => (
                  <table
                    className="border-collapse table-auto w-full text-sm my-4"
                    {...props}
                  />
                ),
                th: ({ node, ...props }) => (
                  <th
                    className="border-b border-border font-bold p-2 text-left bg-muted/50"
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td className="border-b border-border p-2" {...props} />
                ),
                img: ({ node, ...props }) => (
                  <img
                    className="rounded-lg border shadow-sm max-h-[500px] object-contain mx-auto my-4"
                    {...props}
                  />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>,
    document.body,
  );
};
