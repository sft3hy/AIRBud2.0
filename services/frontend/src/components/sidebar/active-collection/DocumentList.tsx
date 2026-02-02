import React from "react";
import { Trash2, Paperclip } from "lucide-react";
import { SessionDocument } from "../../../types";
import { getFileIcon } from "./utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DocumentListProps {
  documents: SessionDocument[];
  onPreview: (id: number) => void;
  onDelete: (id: number) => void;
  isOwner: boolean;
  hasStagedFiles?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onPreview,
  onDelete,
  isOwner,
  hasStagedFiles = false,
}) => {
  return (
    <div className="cursor-mouse px-4 py-4 space-y-2 mb-6">
      {documents.length === 0 ? (
        hasStagedFiles ? null : (
          <div className="flex flex-col items-center justify-center py-12 border-none text-muted-foreground/50 border-2 bg-muted/5">
            <Paperclip className="h-8 w-8 mb-2" />
            <p className="text-xs">No files uploaded</p>
          </div>
        )
      ) : (
        documents.map((doc, index) => (
          <div
            key={doc.id}
            onClick={() => onPreview(doc.id)}
            className="cursor-pointer group grid grid-cols-[1fr_auto] items-center gap-3 w-full p-3 bg-background/80 backdrop-blur-sm hover:bg-muted/60 border rounded-lg text-xs transition-all duration-200 hover:shadow-sm hover:border-primary/20"
          >
            {/* Left side: Number, Icon, Filename, Model info */}
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="flex items-center gap-2 min-w-0">
                <div className="text-muted-foreground font-mono select-none flex-shrink-0">
                  {index + 1}.
                </div>
                <div className="p-2 bg-muted/50 rounded-md group-hover:bg-background/60 transition-colors flex-shrink-0">
                  {getFileIcon(doc.original_filename)}
                </div>

                {/* Filename with tooltip */}
                <div className="cursor-pointer min-w-0 overflow-hidden flex-1">
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <span className="truncate font-semibold text-foreground cursor-default block">
                          {doc.original_filename}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[300px] z-50 break-all"
                      >
                        {doc.original_filename}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </span>

              <div className="flex items-center gap-2 mt-1 min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase flex-shrink-0">
                  Model:
                </span>
                <span className="text-[10px] font-mono text-primary/80 truncate">
                  {doc.vision_model_used.split("-")[1] || "Default"}
                </span>
              </div>
            </div>

            {/* Right side: Trash Can */}
            {isOwner ? (
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span
                          className="inline-block"
                          onClick={(e) => {
                            e.stopPropagation(); // Double safety
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-bold hover:text-red-500 hover:bg-red-500/10 transition-all font-bold"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 border-gray-800">
                        <p className="text-red-400 font-bold text-xs">Delete file</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="bg-blur">
                        Confirm Deletion
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                          {doc.original_filename}
                        </span>
                        ? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(doc.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete File
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="w-7" /> // Spacer
            )}
          </div>
        ))
      )}
    </div>
  );
};