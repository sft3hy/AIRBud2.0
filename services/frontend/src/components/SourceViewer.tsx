import React from 'react';
import ReactMarkdown from 'react-markdown';
import { SearchResult, SessionDocument } from '../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Network } from 'lucide-react';

interface SourceViewerProps {
    sources: SearchResult[];
    documents: SessionDocument[];
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    const vectorSources = sources.filter(s => s.type === 'text' || !s.type);
    const graphSources = sources.filter(s => s.type === 'graph');

    return (
        <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="sources" className="border-b-0">
                <AccordionTrigger className="text-sm text-muted-foreground py-2 hover:no-underline hover:text-primary">
                    📚 View Sources & Analysis
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6 pt-2">

                        {/* 1. KNOWLEDGE GRAPH HITS */}
                        {graphSources.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="font-semibold text-xs flex items-center gap-2 text-purple-600">
                                    <Network className="h-3 w-3" /> Knowledge Graph Facts
                                </h5>
                                <div className="grid grid-cols-1 gap-2">
                                    {graphSources.map((src, idx) => (
                                        <div key={idx} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-2 rounded-md text-xs">
                                            <span className="font-mono text-purple-700 dark:text-purple-300">{src.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. VECTOR TEXT HITS */}
                        {vectorSources.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="font-semibold text-xs flex items-center gap-2 text-blue-600">
                                    <FileText className="h-3 w-3" /> Document Excerpts
                                </h5>
                                <div className="grid gap-2">
                                    {vectorSources.map((src, idx) => {
                                        const distance = src.score ? parseFloat(src.score.toString()) : 0;
                                        const relevance = Math.max(0, (1 - (distance / 2)) * 100).toFixed(0);
                                        const filename = src.source.split('/').pop() || 'Unknown';
                                        const pageDisplay = src.page && src.page > 0 ? `Page ${src.page}` : 'Page N/A';

                                        return (
                                            <Card key={idx} className="p-3 text-sm bg-muted/50 border-none shadow-sm">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs text-muted-foreground font-medium">{filename} ({pageDisplay})</span>
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{relevance}% Match</Badge>
                                                </div>
                                                <div className="text-muted-foreground text-xs leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                                                    <ReactMarkdown>{src.text}</ReactMarkdown>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};