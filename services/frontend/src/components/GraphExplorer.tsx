import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from '@tanstack/react-query';
import { getCollectionGraph } from '../lib/api';
import { Loader2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface GraphExplorerProps {
    collectionId: string | null;
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({ collectionId }) => {
    const graphRef = useRef<any>();
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: graphData, isLoading, refetch } = useQuery({
        queryKey: ['graph', collectionId],
        queryFn: () => getCollectionGraph(collectionId!),
        enabled: !!collectionId,
    });

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                w: containerRef.current.offsetWidth,
                h: containerRef.current.offsetHeight
            });
        }
    }, [containerRef.current]);

    if (!collectionId) return <div className="p-8 text-center text-muted-foreground">Select a collection to view the graph.</div>;
    if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    const handleZoomIn = () => { graphRef.current?.zoom(graphRef.current.zoom() * 1.2, 400); };
    const handleZoomOut = () => { graphRef.current?.zoom(graphRef.current.zoom() / 1.2, 400); };

    return (
        <div className="relative h-full w-full bg-muted/10 flex flex-col" ref={containerRef}>
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button variant="secondary" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={handleZoomIn}><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={handleZoomOut}><ZoomOut className="h-4 w-4" /></Button>
            </div>

            {/* Stats Overlay */}
            <Card className="absolute top-4 left-4 z-10 p-3 bg-background/80 backdrop-blur border text-xs">
                <div className="font-semibold mb-1">Graph Stats</div>
                <div>Nodes: {graphData?.nodes.length || 0}</div>
                <div>Relationships: {graphData?.links.length || 0}</div>
            </Card>

            <div className="flex-1 overflow-hidden cursor-move">
                {graphData && (
                    <ForceGraph2D
                        ref={graphRef}
                        width={dimensions.w}
                        height={dimensions.h}
                        graphData={graphData}
                        nodeLabel="id"
                        nodeColor={node => node.group === 'Document' ? '#3b82f6' : '#a855f7'} // Blue for Docs, Purple for Entities
                        nodeRelSize={6}
                        linkColor={() => 'rgba(150, 150, 150, 0.5)'}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}

                        // Node Canvas Object for custom text rendering
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            const label = node.id as string;
                            const fontSize = 12 / globalScale;
                            ctx.font = `${fontSize}px Sans-Serif`;
                            const textWidth = ctx.measureText(label).width;
                            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                            if (node.x && node.y) {
                                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = node.group === 'Document' ? '#1d4ed8' : '#7e22ce';
                                ctx.fillText(label, node.x, node.y);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};