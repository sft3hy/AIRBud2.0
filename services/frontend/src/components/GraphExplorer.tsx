import React, { useEffect, useRef, useState } from 'react';
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
                // Only update if dimensions actually changed > 0
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
                        // KEY FIX: Force re-render when dimensions change (e.g. switching tabs)
                        key={`${dimensions.w}-${dimensions.h}`}
                        ref={graphRef}
                        width={dimensions.w}
                        height={dimensions.h}
                        graphData={graphData}

                        // Physics settings
                        cooldownTicks={100}
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}

                        // Node Styling
                        nodeLabel="id"
                        nodeColor={node => node.group === 'Document' ? '#3b82f6' : '#a855f7'}
                        nodeRelSize={6}

                        // Link Styling
                        linkColor={() => 'rgba(150, 150, 150, 0.5)'}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                        linkWidth={1.5}

                        // Custom Render (Simplified for reliability)
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            const label = node.id as string;
                            const fontSize = 12 / globalScale;
                            ctx.font = `${fontSize}px Sans-Serif`;
                            const textWidth = ctx.measureText(label).width;
                            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                            // Draw text background
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                            if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
                                ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                                // Draw text
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = node.group === 'Document' ? '#1d4ed8' : '#7e22ce';
                                ctx.fillText(label, node.x!, node.y!);
                            }
                        }}
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