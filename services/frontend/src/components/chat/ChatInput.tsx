import React, { useState } from "react";
import { CircleArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isPending: boolean;
  hasDocuments: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isPending,
  hasDocuments,
}) => {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (!input.trim() || isPending || !hasDocuments) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full px-1 pb-6 z-20">
      <div className="max-w-2xl mx-auto">
        {/* Input Container */}
        <div
          className={`relative flex items-end gap-3 bg-muted/40 border rounded-[24px] transition-all duration-300 ${
            isFocused
              ? "ring-2 ring-primary/20 border-primary/50 shadow-lg shadow-primary/5"
              : "border-border/50 shadow-sm hover:shadow-md hover:bg-muted/60"
          }`}
        >
          {/* Input Field */}
          <div className="flex-1 relative">
            <textarea
              placeholder={
                hasDocuments
                  ? "Chat with your collection..."
                  : "Upload a document to start chatting..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isPending || !hasDocuments}
              rows={1}
              className={`w-full px-5 py-3 text-base bg-transparent rounded-l-[24px] outline-none transition-all duration-200 text-foreground placeholder:text-muted-foreground resize-none overflow-y-auto ${
                !hasDocuments ? "opacity-50 cursor-not-allowed" : ""
              }`}
              style={{
                maxHeight: "360px",
                minHeight: "44px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 360) + "px";
              }}
            />
          </div>

          {/* Send Button */}
          <div className="pr-2 pb-2">
            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending || !hasDocuments}
              className={`group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                !input.trim() || isPending || !hasDocuments
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
              }`}
            >
              {/* Glow effect on hover */}
              {input.trim() && !isPending && hasDocuments && (
                <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
              )}

              <CircleArrowUp
                className={`relative z-10 transition-all duration-300 ${
                  !input.trim() || isPending || !hasDocuments
                    ? "w-5 h-5"
                    : "w-5 h-5 group-hover:scale-110"
                } ${isPending ? "animate-pulse" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
