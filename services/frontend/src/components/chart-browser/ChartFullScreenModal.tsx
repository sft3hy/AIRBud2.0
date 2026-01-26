import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      className="fixed left-0 right-0 top-5 bottom-5 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        size="icon"
        onClick={onClose}
        aria-label="Close Fullscreen"
        className="
            absolute top-6 right-6 z-50
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

      {/* Large Image Container */}
      <div className="relative w-full h-full p-4 md:p-12 flex flex-col items-center justify-center">
        <div
          className="relative max-w-full max-h-full flex items-center justify-center flex-1 min-h-0"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt="Fullscreen Chart"
            className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300 select-none"
          />
        </div>

        {/* Description Overlay */}
        {description && (
          <div
            className="mt-4 max-w-3xl w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-4 text-white/90 text-sm leading-relaxed overflow-y-auto max-h-[150px]"
            onClick={(e) => e.stopPropagation()}
          >
            {description}
          </div>
        )}

        {/* Navigation Hints - Moved if description exists or kept absolute */}
        {!description && (
          <div className="absolute bottom-8 text-white/40 text-xs font-mono tracking-widest pointer-events-none select-none">
            USE ARROW KEYS TO NAVIGATE • ESC TO CLOSE
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};