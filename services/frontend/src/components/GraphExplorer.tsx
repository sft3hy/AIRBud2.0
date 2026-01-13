import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from '@tanstack/react-query';
import { getCollectionGraph } from '../lib/api';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, Network } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface GraphExplorerProps {
    collectionId: string | null;
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({ collectionId }) => {
    const graphRef = useRef<any>();
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: graphData, isLoading, refetch } = useQuery({
        queryKey: ['graph', collectionId],
        queryFn: () => getCollectionGraph(collectionId!),
        enabled: !!collectionId,
    });

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    setDimensions({
                        w: entry.contentRect.width,
                        h: entry.contentRect.height
                    });
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // --- Custom Node Rendering (Circle + Label Below) ---
    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

        const label = node.id as string;
        const fontSize = 12 / globalScale;
        const radius = 5; // Node size

        // 1. Draw Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.group === 'Document' ? '#3b82f6' : '#a855f7'; // Blue for Doc, Purple for Entity
        ctx.fill();

        // Node Border
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        // 2. Draw Label (Text)
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // White outline for text (readability)
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineJoin = 'round';
        ctx.strokeText(label, node.x, node.y + radius + 2);

        // Actual Text
        ctx.fillStyle = '#0f172a'; // Dark slate
        ctx.fillText(label, node.x, node.y + radius + 2);
    }, []);

    // --- Custom Link Rendering (Relationship Label) ---
    const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        // Wait for physics simulation to assign coordinates
        if (!link.source.x || !link.target.x) return;

        const label = link.label;
        if (!label) return;

        const start = link.source;
        const end = link.target;

        // Calculate Midpoint
        const textPos = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2
        };

        const fontSize = 10 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

        ctx.save();
        ctx.translate(textPos.x, textPos.y);

        // Calculate Rotation
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        let rotation = angle;
        // Flip text if it's upside down
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            rotation += Math.PI;
        }
        ctx.rotate(rotation);

        // Draw Label Background (so line doesn't strike through text)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

        // Draw Label Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#64748b'; // Muted gray
        ctx.fillText(label, 0, 0);

        ctx.restore();
    }, []);


    if (!collectionId) return <div className="p-8 text-center text-muted-foreground">Select a collection to view the graph.</div>;
    if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    const hasData = graphData && graphData.nodes.length > 0;

    return (
        <div className="relative h-full w-full bg-muted/10 flex flex-col" ref={containerRef}>
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button variant="secondary" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.2, 400)}><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={() => graphRef.current?.zoom(graphRef.current.zoom() / 1.2, 400)}><ZoomOut className="h-4 w-4" /></Button>
            </div>

            {/* Stats Overlay */}
            <Card className="absolute top-4 left-4 z-10 p-3 bg-background/80 backdrop-blur border text-xs shadow-sm">
                <div className="font-semibold mb-1 flex items-center gap-2">
                    <Network className="h-3 w-3" /> Knowledge Graph
                </div>
                <div className="text-muted-foreground">Nodes: <span className="text-foreground font-medium">{graphData?.nodes.length || 0}</span></div>
                <div className="text-muted-foreground">Edges: <span className="text-foreground font-medium">{graphData?.links.length || 0}</span></div>
            </Card>

            <div className="flex-1 overflow-hidden cursor-move">
                {hasData ? (
                    <ForceGraph2D
                        key={`${dimensions.w}-${dimensions.h}`}
                        ref={graphRef}
                        width={dimensions.w}
                        height={dimensions.h}
                        graphData={graphData}

                        // Physics settings
                        cooldownTicks={100}
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}

                        // Link Styling
                        linkColor={() => '#cbd5e1'} // Light gray lines
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                        linkWidth={1.5}

                        // Custom Renderers
                        nodeCanvasObject={nodeCanvasObject}
                        linkCanvasObject={linkCanvasObject}
                        linkCanvasObjectMode={() => 'after'} // Draw default line/arrow first, then text on top
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                        <p>No knowledge graph data found for this collection.</p>
                        <p className="text-xs opacity-70 mt-1">Upload documents to generate the graph.</p>
                    </div>
                )}
            </div>
        </div>
    );
};