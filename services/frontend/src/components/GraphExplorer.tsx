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
  Maximize2,
  X,
  FileText,
  Network,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { SessionDocument } from "../types";

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
  documents: SessionDocument[];
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
    isRefetching,
  } = useQuery({
    queryKey: ["graph", collectionId],
    queryFn: () => getCollectionGraph(collectionId!),
    enabled: !!collectionId,
    // --- FIX: Ensure fresh data on tab switch ---
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Preserve existing graph data structure to prevent layout reset flicker
  const [activeData, setActiveData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    if (graphData) {
      setActiveData((prev) => {
        // Basic diff check or just replacement.
        // Ideally we merge positions if IDs match to prevent jumpiness.
        return graphData;
      });
    }
  }, [graphData]);

  const docLookup = useMemo(() => {
    const map = new Map<number, string>();
    documents.forEach((d) => map.set(d.id, d.original_filename));
    return map;
  }, [documents]);

  const docLegend = useMemo(() => {
    if (!activeData?.nodes) return [];
    const activeFiles = new Set<string>();

    activeData.nodes.forEach((n: any) => {
      if (n.doc_ids && Array.isArray(n.doc_ids)) {
        n.doc_ids.forEach((id: number) => {
          const name = docLookup.get(id);
          if (name) activeFiles.add(name);
        });
      }
    });
    return Array.from(activeFiles).sort();
  }, [activeData, docLookup]);

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

  useEffect(() => {
    // Only zoom to fit on INITIAL load
    if (activeData?.nodes?.length > 0 && graphRef.current) {
      // Small timeout to allow canvas to render
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [activeData?.nodes?.length]); // Dep changed to length to avoid zoom on every tick

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

      const label = node.id as string;
      const fontSize = 11 / globalScale;
      const isHovered = hoveredNode?.id === node.id;
      const baseRadius = 6;
      const radius = isHovered ? baseRadius * 1.2 : baseRadius;

      let primaryColor = "#a855f7";
      let secondaryColor = "#9333ea";

      const ids = node.doc_ids || [];
      const filenames = ids
        .map((id: number) => docLookup.get(id))
        .filter(Boolean) as string[];

      if (filenames.length > 1) {
        primaryColor = "#f8fafc";
        secondaryColor = "#cbd5e1";
      } else if (filenames.length === 1) {
        const docColor = stringToColor(filenames[0]);
        primaryColor = docColor;
        secondaryColor = docColor;
      }

      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const padding = 8 / globalScale;
      const bubbleWidth = textWidth + padding * 2;
      const bubbleHeight = fontSize + padding * 1.3;

      if (isHovered) {
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          radius * 3,
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      const gradientBg = ctx.createLinearGradient(
        node.x - bubbleWidth / 2,
        node.y - bubbleHeight / 2,
        node.x + bubbleWidth / 2,
        node.y + bubbleHeight / 2,
      );
      gradientBg.addColorStop(0, primaryColor);
      gradientBg.addColorStop(1, secondaryColor);

      if (isHovered) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        ctx.shadowBlur = 10 / globalScale;
        ctx.shadowOffsetY = 3 / globalScale;
      }

      const cornerRadius = 5 / globalScale;
      ctx.beginPath();
      ctx.roundRect(
        node.x - bubbleWidth / 2,
        node.y - bubbleHeight / 2,
        bubbleWidth,
        bubbleHeight,
        cornerRadius,
      );
      ctx.fillStyle = gradientBg;
      ctx.fill();

      ctx.strokeStyle = isHovered
        ? "rgba(255, 255, 255, 0.8)"
        : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = filenames.length > 1 ? "#0f172a" : "#ffffff";

      if (filenames.length === 1) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2;
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x, node.y);
      ctx.shadowColor = "transparent";
    },
    [hoveredNode, docLookup],
  );

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
        bckgHeight / 2,
      );
      gradient.addColorStop(0, isHovered ? "#f8fafc" : "#ffffff");
      gradient.addColorStop(1, isHovered ? "#e2e8f0" : "#f8fafc");

      ctx.beginPath();
      ctx.roundRect(
        -bckgWidth / 2,
        -bckgHeight / 2,
        bckgWidth,
        bckgHeight,
        4 / globalScale,
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
    [hoveredLink],
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

  // Show loader only on initial load, not background refetches
  if (isLoading && !activeData.nodes.length)
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );

  const hasData = activeData?.nodes?.length > 0;

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
          className="bg-background/80 backdrop-blur-md border shadow-sm hover:bg-accent text-foreground"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          variant={isFullScreen ? "destructive" : "secondary"}
          size="icon"
          onClick={() => setIsFullScreen(!isFullScreen)}
          className={
            isFullScreen
              ? "shadow-sm"
              : "bg-background/80 backdrop-blur-md border shadow-sm hover:bg-accent text-foreground"
          }
        >
          {isFullScreen ? (
            <X className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Legend */}
      <Card className="absolute top-4 left-4 z-10 p-3 bg-background/90 dark:bg-background/80 backdrop-blur-md border shadow-lg max-w-[250px] max-h-[40%] overflow-y-auto">
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
          {docLegend.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              No nodes yet.
            </span>
          )}
        </div>
      </Card>

      <div
        className="flex-1 w-full h-screen overflow-hidden"
        style={{ cursor: hoveredNode ? "pointer" : "grab" }}
      >
        {hasData ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.w}
            height={dimensions.h}
            graphData={activeData}
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
            <Network className="h-32 w-16 mb-4 opacity-20" />
            <p className="text-base font-medium">No Knowledge Graph Data</p>
            <p className="text-xs mt-2">Upload a document to generate nodes.</p>
          </div>
        )}
      </div>
    </div>
  );
};
