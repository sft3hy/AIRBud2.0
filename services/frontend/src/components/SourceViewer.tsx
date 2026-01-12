import React from 'react';
import ReactMarkdown from 'react-markdown';
import { SearchResult, SessionDocument } from '../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SourceViewerProps {
    sources: SearchResult[];
    documents: SessionDocument[];
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    return (
        <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="sources" className="border-b-0">
                <AccordionTrigger className="text-sm text-muted-foreground py-2 hover:no-underline hover:text-primary">
                    📚 View Sources & Related Charts
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-2">
                        <h5 className="font-semibold text-sm">📄 Text Sources</h5>
                        <div className="grid gap-2">
                            {sources.map((src, idx) => {
                                // SCORE FIX:
                                // FAISS IndexFlatL2 returns Squared Euclidean Distance.
                                // Distance = 0 means exact match (100%).
                                // Normalized vectors -> Max distance is 4 (opposite direction), or 2 (orthogonal).
                                // Heuristic: Relevance % = (1 - (Distance / 2)) * 100
                                const distance = src.score ? parseFloat(src.score.toString()) : 0;
                                const relevance = Math.max(0, (1 - (distance / 2)) * 100).toFixed(0);

                                const filename = src.source ? src.source.split('/').pop() : 'Unknown';
                                const pageDisplay = src.page && src.page > 0 ? `Page ${src.page}` : 'Page N/A';

                                return (
                                    <Card key={idx} className="p-3 text-sm bg-muted/50 border-none shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-blue-600 text-xs">
                                                    Source {idx + 1}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {filename} ({pageDisplay})
                                                </span>
                                            </div>

                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                {relevance}% Match
                                            </Badge>
                                        </div>

                                        <div className="text-muted-foreground text-xs leading-relaxed">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                                    strong: ({ node, ...props }) => <span className="font-semibold text-foreground" {...props} />,
                                                }}
                                            >
                                                {src.text}
                                            </ReactMarkdown>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};