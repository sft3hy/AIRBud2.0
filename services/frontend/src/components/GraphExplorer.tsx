import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import ForceGraph2D from "react-force-graph-2d";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getCollectionGraph } from "../lib/api";
import { SessionDocument } from "../types";

// Sub-components
import { drawNode, drawLink } from "./graph-explorer/utils";
import { GraphLegend } from "./graph-explorer/GraphLegend";
import { GraphToolbar } from "./graph-explorer/GraphToolbar";
import {
  NoCollectionState,
  LoadingState,
  EmptyDataState,
} from "./graph-explorer/GraphStates";

interface GraphExplorerProps {
  collectionId: string | null;
  documents: SessionDocument[];
}

// Local wrapper to handle ESC key for fullscreen portal
const FullScreenGraphWrapper: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
}> = ({ onClose, children }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <>{children}</>;
};

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  collectionId,
  documents,
}) => {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout State
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [searchParams, setSearchParams] = useSearchParams();
  const isFullScreen = searchParams.get("fullscreen_graph") === "true";

  const setIsFullScreen = (val: boolean) => {
    setSearchParams((prev) => {
      if (val) {
        prev.set("fullscreen_graph", "true");
      } else {
        prev.delete("fullscreen_graph");
      }
      return prev;
    });
  };

  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);


  // Data Query
  const {
    data: graphData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["graph", collectionId],
    queryFn: () => getCollectionGraph(collectionId!),
    enabled: !!collectionId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const [activeData, setActiveData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    if (graphData) {
      // @ts-ignore
      setActiveData(graphData);
    }
  }, [graphData]);

  // Lookup for quick access to document names by ID
  const docLookup = useMemo(() => {
    const map = new Map<number, string>();
    documents.forEach((d) => map.set(d.id, d.original_filename));
    return map;
  }, [documents]);

  // --- Legend Logic ---
  const legendData = useMemo(() => {
    if (!activeData?.nodes) return { files: [], hasMultiSource: false };

    const activeFiles = new Set<string>();
    let hasMultiSource = false;

    activeData.nodes.forEach((n: any) => {
      const ids = n.doc_ids || [];

      // Detect if node comes from multiple sources
      if (Array.isArray(ids) && ids.length > 1) {
        hasMultiSource = true;
      }

      // Collect individual filenames
      if (Array.isArray(ids)) {
        ids.forEach((id: number) => {
          const name = docLookup.get(id);
          if (name) activeFiles.add(name);
        });
      }
    });

    return {
      files: Array.from(activeFiles).sort(),
      hasMultiSource,
    };
  }, [activeData, docLookup]);

  // Resize Handler
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

  // Auto-Zoom on Data Load or Fullscreen toggle
  useEffect(() => {
    if (activeData?.nodes?.length > 0 && graphRef.current) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [activeData?.nodes?.length, isFullScreen]);

  // --- Canvas Callbacks ---
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // @ts-ignore
      drawNode(node, ctx, globalScale, hoveredNode?.id === node.id, docLookup);
    },
    [hoveredNode, docLookup],
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // @ts-ignore
      drawLink(link, ctx, globalScale, hoveredLink === link);
    },
    [hoveredLink],
  );

  // --- Render Conditionals ---
  if (!collectionId) return <NoCollectionState />;
  if (isLoading && !activeData.nodes.length) return <LoadingState />;

  const hasData = activeData?.nodes?.length > 0;

  // UPDATED: Styling for fullscreen vs normal
  const containerClasses = isFullScreen
    ? "fixed left-0 right-0 top-5 bottom-5 z-[9999] bg-background/95 backdrop-blur-md flex flex-col border border-border/50 shadow-2xl rounded-lg overflow-hidden"
    : "relative h-full w-full bg-background/50 flex flex-col overflow-hidden";

  const content = (
    <div className={containerClasses} ref={containerRef}>
      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,hsl(var(--foreground)_/_0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)_/_0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <GraphToolbar
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
      />

      <GraphLegend legendData={legendData} />

      <div
        className="flex-1 w-full h-full relative z-10"
        style={{ cursor: hoveredNode ? "pointer" : "grab" }}
      >
        {hasData ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.w}
            height={dimensions.h}
            graphData={activeData}
            backgroundColor="rgba(0,0,0,0)"
            warmupTicks={100} // Pre-calculate layout before render
            cooldownTicks={0} // Stop ticking immediately after warmup
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            // @ts-ignore
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
          <EmptyDataState />
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return createPortal(
      <FullScreenGraphWrapper onClose={() => setIsFullScreen(false)}>
        {content}
      </FullScreenGraphWrapper>,
      document.body,
    );
  }

  return content;
};
