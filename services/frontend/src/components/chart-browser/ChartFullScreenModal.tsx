import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChartFullscreenModalProps {
  isOpen: boolean;
  imageUrl: string | undefined;
  description?: string;
  onClose: () => void;
}

export const ChartFullscreenModal: React.FC<ChartFullscreenModalProps> = ({
  isOpen,
  imageUrl,
  description,
  onClose,
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Keyboard listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div
      className="fixed left-0 right-0 top-4 bottom-4 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        size="icon"
        onClick={onClose}
        aria-label="Close Fullscreen"
        className="
            absolute top-4 right-6 z-10
            h-12 w-12 rounded-full
            bg-white/10 backdrop-blur
            text-white
            hover:bg-red-500/80 hover:text-white
            border border-white/10
            transition-all
          "
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Content Container - Centered figure with caption */}
      <div
        className="flex items-center justify-center w-full h-full px-4 md:px-8 py-8"
        onClick={(e) => e.stopPropagation()}
      >
        <figure className="flex flex-col max-w-6xl max-h-full w-full">
          {/* Image Container */}
          <div className="flex-1 min-h-0 flex items-center justify-center mb-0">
            <img
              src={imageUrl}
              alt="Fullscreen Chart"
              className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300 select-none rounded-t-lg border border-white/10"
            />
          </div>

          {/* Caption directly under image */}
          {description && (
            <figcaption className="flex-shrink-0 max-h-[200px] min-h-0">
              <ScrollArea className="h-full w-full">
                <div className="bg-white/5 backdrop-blur-sm border border-t-0 border-white/10 rounded-b-lg px-6 py-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="text-white/80 text-sm leading-relaxed">
                    {description}
                  </div>
                </div>
              </ScrollArea>
            </figcaption>
          )}

          {!description && (
            <div className="flex-shrink-0 pt-4 text-center">
              <div className="text-white/40 text-xs font-mono tracking-widest pointer-events-none select-none">
                USE ARROW KEYS TO NAVIGATE • ESC TO CLOSE
              </div>
            </div>
          )}
        </figure>
      </div>
    </div>,
    document.body,
  );
};