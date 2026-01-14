import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { getCollectionCharts } from '../lib/api';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChartBrowserProps {
    collectionId: string | null;
}

export const ChartBrowser: React.FC<ChartBrowserProps> = ({ collectionId }) => {
    const [index, setIndex] = useState(0);

    const { data: allCharts = [] } = useQuery({
        queryKey: ['charts', collectionId],
        queryFn: () => getCollectionCharts(collectionId!),
        enabled: !!collectionId,
    });

    if (!collectionId) {
        return <div className="p-4 text-sm text-muted-foreground text-center">Select a collection to view charts.</div>;
    }

    if (allCharts.length === 0) {
        return <div className="p-4 text-sm text-muted-foreground text-center">No charts detected in this collection.</div>;
    }

    const total = allCharts.length;
    const safeIndex = index >= total ? 0 : index;
    const currentChart = allCharts[safeIndex];

    const handleNext = () => setIndex((prev) => (prev + 1) % total);
    const handlePrev = () => setIndex((prev) => (prev - 1 + total) % total);

    return (
        <div className="flex flex-col h-full">
            {/* Navigation Controls */}
            <div className="flex items-center justify-between p-2 mb-2 bg-muted/40 rounded-lg">
                <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-medium text-center">
                    Chart {safeIndex + 1} / {total}
                </div>
                <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Image Area */}
            <Card className="overflow-hidden bg-muted/20 flex items-center justify-center min-h-[200px] max-h-[300px] mb-4 relative group border">
                {currentChart.url ? (
                    <a href={currentChart.url} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                        <img
                            src={currentChart.url}
                            alt="Chart"
                            className="w-full h-full object-contain hover:scale-105 transition-transform"
                        />
                    </a>
                ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                )}
            </Card>

            {/* Metadata */}
            <ScrollArea className="flex-1">
                <div className="space-y-3 px-1">
                    <div>
                        <span className="text-xs font-semibold text-primary">Source Document:</span>
                        <p className="text-xs text-muted-foreground">{currentChart.doc_name} (Page {currentChart.page})</p>
                    </div>

                    <div>
                        {/* Display the Model Name */}
                        <span className="text-xs font-semibold text-primary">
                            AI Description ({currentChart.vision_model_used || "Unknown"}):
                        </span>
                        <div className="mt-1 text-xs text-muted-foreground leading-relaxed bg-muted/40 p-2 rounded border max-h-[200px] overflow-y-auto">
                            {currentChart.description || "No description available."}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};