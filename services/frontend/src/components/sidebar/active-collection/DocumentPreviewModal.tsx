import { getCollectionCharts } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { FileText, X, ImageIcon, Maximize2 } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { SessionDocument } from "@/types";

interface DocumentPreviewModalProps {
  content: string | null;
  onClose: () => void;
  collectionId?: string; // New prop
  document?: SessionDocument; // New prop
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  content,
  onClose,
  collectionId,
  document: doc,
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

  // Fetch charts if we have context
  const { data: allCharts = [] } = useQuery({
    queryKey: ["charts", collectionId],
    queryFn: () => (collectionId ? getCollectionCharts(collectionId) : []),
    enabled: !!collectionId && !!doc,
  });

  // Filter and Append Scraped Photos
  const enhancedContent = useMemo(() => {
    if (!content) return null;
    if (!doc || !allCharts.length) return content;

    // Filter charts for this document
    // STRICT check by doc_id to avoid matching stale/duplicate documents with same filename
    let relevantCharts = allCharts.filter((c: any) => c.doc_id === doc.id);

    // Fallback: If no doc_id match (legacy backend), try filename match
    if (relevantCharts.length === 0) {
      relevantCharts = allCharts.filter((c: any) => c.doc_name === doc.original_filename);
    }

    // Create a lookup map for faster access: filename -> chart
    const chartMap = new Map();
    relevantCharts.forEach((chart: any) => {
      chartMap.set(chart.filename, chart);
    });

    // Regex to find [CHART_PLACEHOLDER:filename]
    // The parser outputs: [CHART_PLACEHOLDER:filename.png]
    const placeholderRegex = /\[CHART_PLACEHOLDER:(.*?)\]/g;

    console.log("DEBUG: Document:", doc?.original_filename);
    console.log("DEBUG: All Charts:", allCharts);
    console.log("DEBUG: Content length:", content.length);

    const newContent = content.replace(placeholderRegex, (match, filename) => {
      // Find chart by filename (map is faster)
      const chart = chartMap.get(filename);

      console.log(`DEBUG: Match '${match}' -> Filename '${filename}' -> Found: ${!!chart}`);

      if (chart) {
        console.log(`DEBUG: Injecting: ${chart.url}`);
        // IMPORTANT: Markdown image syntax ![alt](url) breaks if alt text has newlines.
        // We must sanitize the description.
        const safeAlt = (chart.description || "Chart").replace(/[\r\n]+/g, " ");
        return `![${safeAlt}](${chart.url})`;
      }
      return match;
    });

    console.log("DEBUG: New Content length:", newContent.length);
    return newContent;
  }, [content, doc, allCharts]);

  if (content === null) return null;

  // Render via Portal to document.body to ensure full-screen coverage
  return createPortal(
    <div
      className="fixed left-0 right-0 top-5 bottom-5 z-[9999] backdrop-blur-sm bg-black/50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        size="icon"
        onClick={onClose}
        className="absolute top-6 right-6 z-50 h-12 w-12 rounded-full bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 transition-all shadow-lg"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Content Container */}
      <div
        className="w-full h-full max-w-5xl bg-card border shadow-2xl rounded-xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm uppercase tracking-wide">
            File Preview
            {doc && (
              <span className="ml-2 text-muted-foreground normal-case">
                - {doc.original_filename}
              </span>
            )}
          </span>
          <span className="ml-auto text-xs mr-12 hidden md:block">
            Press ESC to close
          </span>
        </div>

        {/* Markdown Viewer */}
        <ScrollArea className="flex-1 p-6 md:p-12">

          {/* Added pr-6 to fix text cutoff on the right */}
          <div className="prose dark:prose-invert max-w-none prose-sm md:prose-base leading-relaxed pr-6">
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
                img: ({ node, src, alt, ...props }) => {
                  const [hasError, setHasError] = React.useState(false);
                  const [isZoomed, setIsZoomed] = React.useState(false);

                  if (!src || hasError) {
                    return (
                      <div className="my-8 flex justify-center">
                        <div className="relative group w-full max-w-[500px] aspect-video flex items-center justify-center bg-background/80/50 border-dashed border-2 rounded-xl overflow-hidden">
                          <div className="flex flex-col items-center text-muted-foreground p-4">
                            <ImageIcon className="h-10 w-10 opacity-20 mb-3" />
                            <span className="text-xs font-mono">IMAGE_DATA_MISSING</span>
                            {alt && <span className="text-xs text-center mt-2 opacity-50">{alt}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="my-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500 w-full">
                      <div className="relative group/container max-w-full w-full flex flex-col items-center">
                        {/* Background Grid Pattern - inherited from ChartBrowser style */}
                        <div className="absolute inset-0 -m-4 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] rounded-xl" />

                        <Card
                          className={`relative overflow-hidden border-2 transition-all duration-300 bg-background/80/50 border-muted hover:border-primary/30 hover:shadow-lg ${isZoomed ? 'fixed inset-4 z-[10000] border-primary shadow-2xl bg-black/95 flex items-center justify-center' : 'w-full max-w-4xl'}`}
                          onClick={() => setIsZoomed(!isZoomed)}
                        >
                          <img
                            src={src}
                            alt={alt}
                            onError={() => setHasError(true)}
                            className={`transition-transform duration-500 ${isZoomed ? 'max-w-full max-h-full object-contain' : 'rounded-lg max-h-[600px] object-contain cursor-zoom-in group-hover/container:scale-[1.01] w-full'}`}
                            {...props}
                          />

                          {!isZoomed && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/container:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                              <div className="flex items-center gap-2 text-white font-medium bg-black/40 px-4 py-2 rounded-full border border-white/10">
                                <Maximize2 className="h-4 w-4" />
                                <span>Fullscreen</span>
                              </div>
                            </div>
                          )}

                          {isZoomed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsZoomed(false);
                              }}
                            >
                              <X className="h-6 w-6" />
                            </Button>
                          )}
                        </Card>

                        {alt && !isZoomed && (
                          <div className="w-full max-w-4xl mt-4 p-4 md:p-6 bg-secondary/10 rounded-xl border border-border/40 text-center shadow-sm">
                            <p className="text-base text-muted-foreground leading-relaxed">
                              {alt}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              }}
            >
              {enhancedContent || ""}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>,
    document.body,
  );
};
