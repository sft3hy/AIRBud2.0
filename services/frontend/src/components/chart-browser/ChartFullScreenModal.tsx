import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartFullscreenModalProps {
  isOpen: boolean;
  imageUrl: string | undefined;
  onClose: () => void;
}

export const ChartFullscreenModal: React.FC<ChartFullscreenModalProps> = ({
  isOpen,
  imageUrl,
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

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
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

      {/* Navigation Hints */}
      <div className="absolute bottom-8 text-white/40 text-xs font-mono tracking-widest pointer-events-none select-none">
        USE ARROW KEYS TO NAVIGATE • ESC TO CLOSE
      </div>

      {/* Large Image Container */}
      <div className="relative w-full h-full p-4 md:p-12 flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Fullscreen Chart"
          className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300 select-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body,
  );
};
