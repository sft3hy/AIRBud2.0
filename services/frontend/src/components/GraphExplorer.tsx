import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useQuery } from "@tanstack/react-query";
import { getCollectionGraph } from "../lib/api";
import {
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Network,
  Maximize2,
  X,
  FileText,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import { SessionDocument } from "../types"; // Import this

// Helper: Consistent Color Generator
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

interface GraphExplorerProps {
  collectionId: string | null;
  documents: SessionDocument[]; // ADDED THIS
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  collectionId,
  documents,
}) => {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);

  const {
    data: graphData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["graph", collectionId],
    queryFn: () => getCollectionGraph(collectionId!),
    enabled: !!collectionId,
  });

  // --- NEW: Map IDs to Filenames ---
  const docLookup = useMemo(() => {
    const map = new Map<number, string>();
    documents.forEach((d) => map.set(d.id, d.original_filename));
    return map;
  }, [documents]);

  // --- NEW: Compute Legend based on resolved filenames ---
  const docLegend = useMemo(() => {
    if (!graphData?.nodes) return [];
    const activeFiles = new Set<string>();

    graphData.nodes.forEach((n: any) => {
      if (n.doc_ids && Array.isArray(n.doc_ids)) {
        n.doc_ids.forEach((id: number) => {
          const name = docLookup.get(id);
          if (name) activeFiles.add(name);
        });
      }
    });
    return Array.from(activeFiles).sort();
  }, [graphData, docLookup]);

  // ... (Resize Observer effect remains same) ...

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDims = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ w: offsetWidth, h: offsetHeight });
        }
      }
    };

    const ro = new ResizeObserver(updateDims);
    ro.observe(containerRef.current);
    updateDims();

    return () => ro.disconnect();
  }, [isFullScreen]);

  // ... (Zoom effect remains same) ...
  useEffect(() => {
    if (graphData?.nodes?.length > 0 && graphRef.current) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50);
      }, 200);
    }
  }, [graphData, dimensions, isFullScreen]);

  // --- UPDATED NODE RENDERER ---
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

      const label = node.id as string;
      const fontSize = 11 / globalScale;
      const isHovered = hoveredNode?.id === node.id;
      const baseRadius = 6;
      const radius = isHovered ? baseRadius * 1.2 : baseRadius;

      // --- COLOR LOGIC ---
      let primaryColor = "#a855f7"; // Default purple
      let secondaryColor = "#9333ea";

      // Resolve Filenames from IDs
      const ids = node.doc_ids || [];
      const filenames = ids
        .map((id: number) => docLookup.get(id))
        .filter(Boolean) as string[];

      if (filenames.length > 1) {
        // SHARED / BRIDGE -> White
        primaryColor = "#f8fafc";
        secondaryColor = "#cbd5e1";
      } else if (filenames.length === 1) {
        // SINGLE SOURCE -> Colored
        const docColor = stringToColor(filenames[0]);
        primaryColor = docColor;
        secondaryColor = docColor;
      }

      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const padding = 8 / globalScale;
      const bubbleWidth = textWidth + padding * 2;
      const bubbleHeight = fontSize + padding * 1.3;

      // Hover Glow
      if (isHovered) {
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          radius * 3
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Bubble Gradient
      const gradientBg = ctx.createLinearGradient(
        node.x - bubbleWidth / 2,
        node.y - bubbleHeight / 2,
        node.x + bubbleWidth / 2,
        node.y + bubbleHeight / 2
      );
      gradientBg.addColorStop(0, primaryColor);
      gradientBg.addColorStop(1, secondaryColor);

      // Shadow
      if (isHovered) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        ctx.shadowBlur = 10 / globalScale;
        ctx.shadowOffsetY = 3 / globalScale;
      }

      // Draw Bubble
      const cornerRadius = 5 / globalScale;
      ctx.beginPath();
      ctx.roundRect(
        node.x - bubbleWidth / 2,
        node.y - bubbleHeight / 2,
        bubbleWidth,
        bubbleHeight,
        cornerRadius
      );
      ctx.fillStyle = gradientBg;
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered
        ? "rgba(255, 255, 255, 0.8)"
        : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Text Color
      ctx.fillStyle = filenames.length > 1 ? "#0f172a" : "#ffffff";

      // Text Shadow for contrast
      if (filenames.length === 1) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2;
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x, node.y);
      ctx.shadowColor = "transparent"; // Reset
    },
    [hoveredNode, docLookup]
  );

  // ... (linkCanvasObject remains exactly the same as previous step) ...
  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!link.source.x || !link.target.x) return;

      const label = link.label;
      if (!label) return;

      const start = link.source;
      const end = link.target;
      const isHovered = hoveredLink === link;

      const textPos = {
        x: start.x + (end.x - start.x) / 2,
        y: start.y + (end.y - start.y) / 2,
      };

      const fontSize = 9 / globalScale;
      ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const padding = 6 / globalScale;
      const bckgWidth = textWidth + padding * 2;
      const bckgHeight = fontSize + padding * 1.1;

      ctx.save();
      ctx.translate(textPos.x, textPos.y);

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      let rotation = angle;
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        rotation += Math.PI;
      }
      ctx.rotate(rotation);

      if (isHovered) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 8 / globalScale;
        ctx.shadowOffsetY = 2 / globalScale;
      }

      const gradient = ctx.createLinearGradient(
        -bckgWidth / 2,
        -bckgHeight / 2,
        bckgWidth / 2,
        bckgHeight / 2
      );
      gradient.addColorStop(0, isHovered ? "#f8fafc" : "#ffffff");
      gradient.addColorStop(1, isHovered ? "#e2e8f0" : "#f8fafc");

      ctx.beginPath();
      ctx.roundRect(
        -bckgWidth / 2,
        -bckgHeight / 2,
        bckgWidth,
        bckgHeight,
        4 / globalScale
      );
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = isHovered ? "#94a3b8" : "#cbd5e1";
      ctx.lineWidth = (isHovered ? 2 : 1) / globalScale;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHovered ? "#1e293b" : "#475569";
      ctx.fillText(label, 0, 0);

      ctx.restore();
    },
    [hoveredLink]
  );

  if (!collectionId)
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center text-muted-foreground">
          <Network className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Collection Selected</p>
        </div>
      </div>
    );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );

  const hasData = graphData && graphData.nodes.length > 0;
  const containerClasses = isFullScreen
    ? "fixed inset-0 z-[100] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col"
    : "relative h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col";

  return (
    <div className={containerClasses} ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => refetch()}
          className="bg-white/90 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant={isFullScreen ? "destructive" : "secondary"}
          size="icon"
          onClick={() => setIsFullScreen(!isFullScreen)}
          // When Full Screen (red X), remove bg-white so it stays solid red
          className={isFullScreen ? "shadow-sm" : "bg-white/90 shadow-sm"}
        >
          {isFullScreen ? (
            <X className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Legend (using resolved filenames) */}
      <Card className="absolute top-4 left-4 z-10 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg max-w-[250px] max-h-[40%] overflow-y-auto">
        <div className="font-semibold mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3 w-3" /> Sources
        </div>
        <div className="space-y-1.5">
          {docLegend.map((docName) => (
            <div key={docName} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm"
                style={{ backgroundColor: stringToColor(docName) }}
              />
              <span className="truncate" title={docName}>
                {docName}
              </span>
            </div>
          ))}
          {docLegend.length > 0 && (
            <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-dashed">
              <div className="w-3 h-3 rounded-full shrink-0 bg-slate-100 border border-slate-300" />
              <span className="text-muted-foreground">
                Shared / Bridge Nodes
              </span>
            </div>
          )}
        </div>
      </Card>

      <div
        className="flex-1 w-full h-full overflow-hidden"
        style={{ cursor: hoveredNode ? "pointer" : "grab" }}
      >
        {hasData ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.w}
            height={dimensions.h}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            linkDistance={120}
            chargeStrength={-300}
            linkColor={(link) => (hoveredLink === link ? "#64748b" : "#cbd5e1")}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkWidth={(link) => (hoveredLink === link ? 2.5 : 2)}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            linkCanvasObjectMode={() => "after"}
            onNodeHover={(node) => setHoveredNode(node)}
            onLinkHover={(link) => setHoveredLink(link)}
            enableNodeDrag={true}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Network className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-base font-medium">No Knowledge Graph Data</p>
          </div>
        )}
      </div>
    </div>
  );
};
