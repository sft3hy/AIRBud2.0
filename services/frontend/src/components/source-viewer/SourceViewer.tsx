import React, { useMemo, useRef, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import ForceGraph2D from "react-force-graph-2d";
import { BookOpenText } from "lucide-react";
import { SearchResult, SessionDocument } from "../../types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Network } from "lucide-react";
import { drawNode, drawLink } from "../graph-explorer/utils";

interface SourceViewerProps {
  sources: SearchResult[];
  documents?: SessionDocument[];
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ sources, documents }) => {
  if (!sources || sources.length === 0) return null;

  const vectorSources = sources.filter((s) => s.type === "text" || !s.type);
  const graphSources = sources.filter((s) => s.type === "graph");
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [isOpen, setIsOpen] = useState(false); // Track open state for performance
  const [isDark, setIsDark] = useState(false);

  React.useEffect(() => {
    // Initial check
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    // Observer for class changes on html element
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!containerRef.current || !isOpen) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [graphSources, isOpen]);

  // --- Parse Graph Data ---
  const miniGraphData = useMemo(() => {
    const nodes = new Map<string, any>();
    const links: any[] = [];

    graphSources.forEach((src) => {
      const text = src.text;
      let sourceId, targetId, label;

      // Pattern 1: Mermaid style "A --[Label]-> B"
      // Regex: Capture (NodeA) --[(Label)]--> (NodeB)
      const mermaidRegex = /(.+?)\s*--\[(.*?)\]-->\s*(.+?)$/m;
      const mermaidMatch = text.match(mermaidRegex);

      if (mermaidMatch) {
        sourceId = (mermaidMatch[1] || "").trim();
        label = (mermaidMatch[2] || "").trim();
        targetId = (mermaidMatch[3] || "").trim();
      } else {
        // Pattern 2: Standard style "A -> B [Label]" or "A -> B (Label)"
        // Regex: Capture (NodeA) -> (NodeB) [(Label)]?
        const standardRegex =
          /(.+?)\s*->\s*(.+?)(?:\s*(?:\[|\()(.*?)(?:\]|\)))?$/m;
        const standardMatch = text.match(standardRegex);

        if (standardMatch) {
          sourceId = (standardMatch[1] || "").trim();
          targetId = (standardMatch[2] || "").trim();
          label = standardMatch[3] ? standardMatch[3].trim() : "";
        }
      }

      if (sourceId && targetId) {
        if (!nodes.has(sourceId)) nodes.set(sourceId, { id: sourceId });
        if (!nodes.has(targetId)) nodes.set(targetId, { id: targetId });

        links.push({
          source: sourceId,
          target: targetId,
          label: label,
        });
      } else {
        // Fallback: Just a node for the text
        const id = text.trim();
        if (!nodes.has(id)) nodes.set(id, { id });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links: links,
    };
  }, [graphSources]);

  const hasGraphData = miniGraphData.nodes.length > 0;

  // --- Canvas Callbacks (Reuse utils) ---
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // Pass empty map for docLookup as we don't have file mapping here easily
      drawNode(node, ctx, globalScale, false, new Map(), isDark);
    },
    [isDark],
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      drawLink(link, ctx, globalScale, false, isDark);
    },
    [isDark],
  );

  return (
    <div className="w-full mt-4">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        onValueChange={(value) => setIsOpen(value === "context")}
      >
        <AccordionItem value="context" className="border-none">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground py-2 hover:no-underline hover:text-primary transition-colors bg-muted/30 px-3 rounded-md">
            <span className="flex items-center gap-2"><BookOpenText /> View Context</span>
          </AccordionTrigger>
          <AccordionContent className="pt-3 pb-1 space-y-4">
            {/* 1. KNOWLEDGE GRAPH HITS (MINI GRAPH) */}
            {hasGraphData && isOpen && (
              <div className="space-y-2">
                <h5 className="font-semibold text-xs flex items-center gap-2 text-purple-600 uppercase tracking-wider">
                  <Network className="h-3 w-3" /> Knowledge Graph
                </h5>
                <div
                  ref={containerRef}
                  className="h-[300px] w-full bg-slate-950/50 rounded-lg border border-purple-500/20 overflow-hidden relative"
                >
                  <ForceGraph2D
                    ref={graphRef}
                    width={width}
                    height={300}
                    graphData={miniGraphData}
                    backgroundColor="rgba(0,0,0,0)"
                    nodeCanvasObject={nodeCanvasObject}
                    linkCanvasObject={linkCanvasObject}
                    linkCanvasObjectMode={() => "after"} // Draw label AFTER the link
                    linkDirectionalArrowLength={6}
                    linkDirectionalArrowRelPos={1}
                    linkColor={() =>
                      isDark
                        ? "rgba(148, 163, 184, 0.6)"
                        : "rgba(71, 85, 105, 0.6)"
                    }
                    linkDirectionalArrowColor={() =>
                      isDark
                        ? "rgba(148, 163, 184, 0.6)"
                        : "rgba(71, 85, 105, 0.6)"
                    }
                    cooldownTicks={100}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                  />
                  {/* <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground pointer-events-none">
                    Interactive Graph
                  </div> */}
                </div>
              </div>
            )}

            {/* 2. VECTOR TEXT HITS */}
            {vectorSources.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-xs flex items-center gap-2 text-blue-600 uppercase tracking-wider">
                  <FileText className="h-3 w-3" /> Relevant Sections
                </h5>
                <div className="grid gap-3">
                  {vectorSources.map((src, idx) => {
                    const distance = src.score
                      ? parseFloat(src.score.toString())
                      : 0;
                    const relevance = Math.max(
                      0,
                      (1 - distance / 2) * 100,
                    ).toFixed(0);
                    const filename = src.source.split("/").pop() || "Unknown";

                    // Improved Page Logic
                    let pageDisplay = "Page 1";
                    if (src.page && src.page > 0) {
                      pageDisplay = `Page ${src.page}`;
                    }

                    // --- IMAGE VISUALIZATION LOGIC ---
                    let imageUrl: string | null = null;
                    let visualDescription: string | null = null;
                    let displayContent = src.text;
                    const cleanFilename = filename;

                    // 1. Find matching document from props (Robust Match)
                    const matchingDoc = documents?.find(d => {
                      if (!d.original_filename) return false;
                      const docName = d.original_filename.toLowerCase();
                      const sourceName = src.source.toLowerCase();
                      // Check exact match or if source path contains the filename
                      return sourceName.includes(docName) || docName === cleanFilename.toLowerCase();
                    });

                    // 2. Extract UUID from chart_dir if available
                    if (matchingDoc && matchingDoc.chart_dir) {
                      // Handle potential trailing slash or mixed separators
                      const parts = matchingDoc.chart_dir.replace(/\\/g, '/').replace(/\/$/, '').split('/');
                      const chartDirName = parts.pop();

                      if (chartDirName) {
                        // 3. Search text for visual pattern
                        // Regex matches "Visual Scene Analysis (filename.png):"
                        const visualMatch = src.text.match(/Visual Scene Analysis \((.+?)\):/i);
                        if (visualMatch && visualMatch[1]) {
                          const imageFilename = visualMatch[1].trim();

                          // Fix: The backend creates a sub-folder with the filename (no ext) inside the chart_dir
                          // We need to reconstruct this path.
                          // assumption: chartDirName is like "UUID_Filename.ext"
                          // subDir is likely "Filename" (without .ext)

                          // Safely extract the UUID-less part if possible, or just use the logic we see in the FS
                          // FS shows: /data/charts/{UUID}_{Filename.ext}/{Filename_No_Ext}/{Image}

                          // Actually, we can just use the matchingDoc.original_filename if available
                          let subDirName = "";
                          if (matchingDoc.original_filename) {
                            // Remove extension
                            subDirName = matchingDoc.original_filename.replace(/\.[^/.]+$/, "");
                          } else {
                            // Fallback: try to guess from chartDirName if it follows UUID_Filename pattern
                            // removing the UUID prefix is risky if format changes, but let's try to just strip extension from the chartDirName's suffix
                            // But actually, seeing the FS: 
                            // Parent: 417e...Activity Report.pdf
                            // Child: Activity Report

                            // Let's assume the child folder matches the filename without extension.
                            // We can try to derive it from the cleanFilename (which comes from src.source)
                            subDirName = cleanFilename.replace(/\.[^/.]+$/, "");
                          }

                          // Construct URL with proper encoding
                          // encodeURIComponent is CRITICAL for filenames with spaces/commas
                          imageUrl = `${import.meta.env.BASE_URL}static/charts/${encodeURIComponent(chartDirName)}/${encodeURIComponent(subDirName)}/${encodeURIComponent(imageFilename)}`;

                          // Extract description
                          // The regex found the start. Let's capture the description following it.
                          // We want to remove the entire "Visual Scene Analysis (...): Description" block from main text
                          // and put the "Description" into visualDescription.

                          // Improved Regex to capture the whole block
                          const fullBlockRegex = /Visual Scene Analysis \((.+?)\):([\s\S]*?)(?=(?:Visual Scene Analysis|$))/i;
                          const blockMatch = src.text.match(fullBlockRegex);

                          if (blockMatch) {
                            // blockMatch[0] is the whole block "Visual ... : Description"
                            // blockMatch[2] is the description part
                            visualDescription = blockMatch[2]?.trim() || "";

                            // Remove from display content
                            displayContent = displayContent.replace(blockMatch[0], "").trim();
                          }
                        }
                      }
                    }

                    return (
                      <Card
                        key={idx}
                        className="group overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 bg-card/50 backdrop-blur-sm"
                      >
                        <div className="p-3 bg-muted/30 border-b border-border/50 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary/70" />
                            <span className="text-xs font-semibold text-foreground/80">
                              {filename}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              • {pageDisplay}
                            </span>
                          </div>

                          {/* Improved Badge Style */}
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-2 bg-primary/10 text-primary border border-primary/20 round-full shadow-none hover:bg-primary/20 transition-colors"
                          >
                            {relevance}% Match
                          </Badge>
                        </div>

                        <div className="p-3 text-xs text-muted-foreground leading-relaxed">

                          {/* INLINE IMAGE DISPLAY */}
                          {imageUrl ? (
                            <div className="mb-3 rounded-md overflow-hidden border border-border/50 relative group/img bg-black/5 min-h-[100px] flex flex-col items-center justify-center">
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded z-10">
                                Visual Analysis
                              </div>
                              <img
                                src={imageUrl}
                                alt="Visual Context"
                                className="w-full h-auto max-h-60 object-contain p-1"
                                onError={(e) => {
                                  // Fallback to error message
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const errDisplay = document.createElement('div');
                                    errDisplay.className = "flex flex-col items-center justify-center p-4 text-xs text-muted-foreground gap-1 text-center w-full";
                                    errDisplay.innerHTML = `<span class="mb-1">Image Unavailable</span><span class="opacity-40 text-[9px] font-mono break-all px-2">${imageUrl}</span>`;
                                    parent.appendChild(errDisplay);
                                  }
                                }}
                              />
                              {visualDescription && (
                                <div className="w-full bg-muted/50 p-2 text-[12px] text-muted-foreground border-t border-border/30 italic">
                                  {visualDescription}
                                </div>
                              )}
                            </div>
                          ) : null}

                          <ReactMarkdown className="prose prose-xs dark:prose-invert max-w-none">
                            {displayContent}
                          </ReactMarkdown>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
