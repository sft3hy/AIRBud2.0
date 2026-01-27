import React, { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { uploadAndProcessDocument } from '../lib/api';
import { useToast } from "@/components/ui/use-toast";
import { VisionModel } from '../types';

export interface QueueItem {
    id: string;
    file: File;
    sessionId: string;
    model: VisionModel;
    status: 'pending' | 'uploading' | 'processing' | 'error' | 'completed';
}

interface QueueContextType {
    queue: QueueItem[];
    addToQueue: (files: File[], sessionId: string, model: VisionModel) => void;
    isProcessing: boolean;
    activeFileId: string | null;
    currentFile: QueueItem | null;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: ReactNode; onJobStarted?: (jobId: string) => void }> = ({ children, onJobStarted }) => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);

    // Refs for async stability
    const queueRef = useRef<QueueItem[]>([]);
    const isProcessingRef = useRef(false);

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const updateQueue = (newQueue: QueueItem[]) => {
        setQueue(newQueue);
        queueRef.current = newQueue;
    };

    const addToQueue = (files: File[], sessionId: string, model: VisionModel) => {
        const newItems: QueueItem[] = files.map(f => ({
            id: Math.random().toString(36).substring(7),
            file: f,
            sessionId,
            model,
            status: 'pending' as const
        }));

        // Append to queue
        const nextQueue = [...queueRef.current, ...newItems];
        updateQueue(nextQueue);

        // Trigger processing if idle
        if (!isProcessingRef.current) {
            processNext();
        }
    };

    const processNext = useCallback(async () => {
        // Access ref directly to avoid closure staleness
        if (isProcessingRef.current) return;
        if (queueRef.current.length === 0) return;

        isProcessingRef.current = true;
        const currentItem = queueRef.current[0];

        if (!currentItem) {
            isProcessingRef.current = false;
            return;
        }

        setActiveFileId(currentItem.id);

        // Update item status to uploading
        const updatedQueue = [...queueRef.current];
        updatedQueue[0] = { ...currentItem, status: 'uploading' };
        updateQueue(updatedQueue);

        try {
            // 1. Upload
            // Note: We don't need to await the *entire* processing if the backend returns early.
            // But our current api.ts awaits response.
            const response = await uploadAndProcessDocument(
                currentItem.sessionId,
                currentItem.file,
                currentItem.model
            );

            if (response.status === "already_queued") {
                if (onJobStarted) onJobStarted(currentItem.sessionId);
            } else {
                // Success
                if (onJobStarted) onJobStarted(currentItem.sessionId);
            }

            // 2. Mark as completed/popped
            // Remove the processed item
            updateQueue(queueRef.current.slice(1));

        } catch (e) {
            console.error("Upload failed", e);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: `Could not process ${currentItem.file.name}.`,
            });

            // Remove failed item
            updateQueue(queueRef.current.slice(1));
        } finally {
            isProcessingRef.current = false;
            setActiveFileId(null);

            // Trigger next
            // We use a timeout to allow state updates to settle if needed, or just recursion
            setTimeout(() => {
                // Check ref again
                if (queueRef.current.length > 0) {
                    processNext();
                }
            }, 100);
        }
    }, [onJobStarted, toast]);

    // Watcher to trigger process if queue has items and we are idle (double safety)
    useEffect(() => {
        if (queue.length > 0 && !isProcessingRef.current) {
            processNext();
        }
    }, [queue, processNext]);

    return (
        <QueueContext.Provider value={{
            queue,
            addToQueue,
            isProcessing: isProcessingRef.current,
            activeFileId,
            currentFile: queue[0] || null
        }}>
            {children}
        </QueueContext.Provider>
    );
};

export const useQueue = () => {
    const context = useContext(QueueContext);
    if (!context) throw new Error("useQueue must be used within QueueProvider");
    return context;
};
