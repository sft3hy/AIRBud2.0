import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from '@tanstack/react-query';
import { getCollectionGraph } from '../lib/api';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, Network, Maximize2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '@/lib/utils'; // Optional if you use it, but generic strings work too

interface GraphExplorerProps {
    collectionId: string | null;
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({ collectionId }) => {
    const graphRef = useRef<any>();
    const containerRef = useRef<HTMLDivElement>(null);
    
    // FIX: Initialize with non-zero values to prevent invisible canvas on load
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
    
    // NEW: Full Screen State
    const [isFullScreen, setIsFullScreen] = useState(false);
    
    const [hoveredNode, setHoveredNode] = useState<any>(null);
    const [hoveredLink, setHoveredLink] = useState<any>(null);

    const { data: graphData, isLoading, refetch } = useQuery({
        queryKey: ['graph', collectionId],
        queryFn: () => getCollectionGraph(collectionId!),
        enabled: !!collectionId,
    });

    // FIX: Resize Observer to accurately handle container size changes
    // Added [isFullScreen] dependency to ensure it recalculates immediately on toggle
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
        
        // Initial check
        updateDims();

        return () => ro.disconnect();
    }, [isFullScreen]); 

    // Zoom to fit when data arrives or screen changes
    useEffect(() => {
        if (graphData?.nodes?.length > 0 && graphRef.current) {
            setTimeout(() => {
                graphRef.current.zoomToFit(400, 50);
            }, 200);
        }
    }, [graphData, dimensions, isFullScreen]);

    // --- Custom Node Rendering (Modern Bubble Style) ---
    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

        const label = node.id as string;
        const fontSize = 11 / globalScale;
        const isHovered = hoveredNode?.id === node.id;
        const baseRadius = 6;
        const radius = isHovered ? baseRadius * 1.2 : baseRadius;

        // Text measurements for bubble sizing
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const padding = 8 / globalScale;
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = fontSize + padding * 1.3;

        // 1. Draw outer glow for hover effect
        if (isHovered) {
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
            gradient.addColorStop(0, node.group === 'Document' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
            ctx.fill();
        }

        // 2. Draw Label Bubble with gradient
        const gradientBg = ctx.createLinearGradient(
            node.x - bubbleWidth / 2, 
            node.y - bubbleHeight / 2,
            node.x + bubbleWidth / 2, 
            node.y + bubbleHeight / 2
        );
        
        if (node.group === 'Document') {
            gradientBg.addColorStop(0, isHovered ? '#3b82f6' : '#60a5fa');
            gradientBg.addColorStop(1, isHovered ? '#2563eb' : '#3b82f6');
        } else {
            gradientBg.addColorStop(0, isHovered ? '#a855f7' : '#c084fc');
            gradientBg.addColorStop(1, isHovered ? '#9333ea' : '#a855f7');
        }

        // Bubble shadow
        if (isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10 / globalScale;
            ctx.shadowOffsetY = 3 / globalScale;
        }

        // Draw rounded rectangle bubble
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

        // Bubble border
        ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Draw text inside bubble
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y);

        // Draw small connection dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2 / globalScale, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }, [hoveredNode]);

    // --- Custom Link Rendering (Styled Arrows) ---
    const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!link.source.x || !link.target.x) return;

        const label = link.label;
        if (!label) return;

        const start = link.source;
        const end = link.target;
        const isHovered = hoveredLink === link;

        const textPos = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2
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

        // Shadow for depth
        if (isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 8 / globalScale;
            ctx.shadowOffsetY = 2 / globalScale;
        }

        // Container gradient
        const gradient = ctx.createLinearGradient(
            -bckgWidth / 2, -bckgHeight / 2,
            bckgWidth / 2, bckgHeight / 2
        );
        gradient.addColorStop(0, isHovered ? '#f8fafc' : '#ffffff');
        gradient.addColorStop(1, isHovered ? '#e2e8f0' : '#f8fafc');

        ctx.beginPath();
        ctx.roundRect(-bckgWidth / 2, -bckgHeight / 2, bckgWidth, bckgHeight, 4 / globalScale);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = isHovered ? '#94a3b8' : '#cbd5e1';
        ctx.lineWidth = (isHovered ? 2 : 1) / globalScale;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHovered ? '#1e293b' : '#475569';
        ctx.fillText(label, 0, 0);

        ctx.restore();
    }, [hoveredLink]);

    if (!collectionId) return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
            <div className="text-center text-muted-foreground">
                <Network className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No Collection Selected</p>
                <p className="text-sm opacity-70 mt-1">Select a collection to view the knowledge graph</p>
            </div>
        </div>
    );
    
    if (isLoading) return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
    );

    const hasData = graphData && graphData.nodes.length > 0;

    // --- Dynamic Class for Full Screen vs Normal ---
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
                    title="Refresh Data"
                    className="bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 shadow-lg backdrop-blur-sm border-slate-200 dark:border-slate-700"
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                    variant="secondary" 
                    size="icon" 
                    onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.2, 400)}
                    className="bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 shadow-lg backdrop-blur-sm border-slate-200 dark:border-slate-700"
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>
                <Button 
                    variant="secondary" 
                    size="icon" 
                    onClick={() => graphRef.current?.zoom(graphRef.current.zoom() / 1.2, 400)}
                    className="bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 shadow-lg backdrop-blur-sm border-slate-200 dark:border-slate-700"
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>
                {/* NEW: Full Screen Toggle */}
                <Button 
                    variant={isFullScreen ? "destructive" : "secondary"} 
                    size="icon" 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    className={!isFullScreen ? "bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 shadow-lg backdrop-blur-sm border-slate-200 dark:border-slate-700" : "shadow-lg backdrop-blur-sm"}
                >
                    {isFullScreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            {/* Stats Overlay */}
            <Card className="absolute top-4 left-4 z-10 p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="font-semibold mb-2 flex items-center gap-2 text-base">
                    <Network className="h-4 w-4 text-primary" /> Knowledge Graph
                </div>
                <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                        Nodes: <span className="text-foreground font-semibold">{graphData?.nodes.length || 0}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Edges: <span className="text-foreground font-semibold">{graphData?.links.length || 0}</span>
                    </div>
                </div>
            </Card>

            <div className="flex-1 w-full h-full overflow-hidden" style={{ cursor: hoveredNode ? 'pointer' : 'grab' }}>
                {hasData ? (
                    <ForceGraph2D
                        ref={graphRef}
                        width={dimensions.w}
                        height={dimensions.h}
                        graphData={graphData}

                        // Transparent background to show container gradient
                        backgroundColor="rgba(0,0,0,0)"

                        // Physics settings
                        cooldownTicks={100}
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}
                        linkDistance={120}
                        chargeStrength={-300}

                        // Link Styling
                        linkColor={(link) => hoveredLink === link ? '#64748b' : '#cbd5e1'}
                        linkDirectionalArrowLength={6}
                        linkDirectionalArrowRelPos={1}
                        linkWidth={(link) => hoveredLink === link ? 2.5 : 2}

                        // Custom Renderers
                        nodeCanvasObject={nodeCanvasObject}
                        linkCanvasObject={linkCanvasObject}
                        linkCanvasObjectMode={() => 'after'}

                        // Hover Interactions
                        onNodeHover={(node) => setHoveredNode(node)}
                        onLinkHover={(link) => setHoveredLink(link)}
                        onNodeClick={(node) => {
                            console.log('Node clicked:', node);
                        }}
                        
                        enableNodeDrag={true}
                        enableZoomInteraction={true}
                        enablePanInteraction={true}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Network className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-base font-medium">No Knowledge Graph Data</p>
                        <p className="text-sm opacity-70 mt-1">Upload documents to generate the graph</p>
                    </div>
                )}
            </div>
        </div>
    );
};