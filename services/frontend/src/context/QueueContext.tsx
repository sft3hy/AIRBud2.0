import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { uploadFile, startJob, api } from '../lib/api';
import { useToast } from "@/components/ui/use-toast";
import { VisionModel } from '../types';

export interface QueueItem {
    id: string;
    filename: string;
    sessionId: string;
    model: VisionModel;
    status: 'pending_upload' | 'uploading' | 'uploaded' | 'processing' | 'error' | 'completed';
    // We keep the file object only for the initial session. 
    // If restored from localStorage, 'file' will be missing, but 'filename' allows us to proceed if already uploaded.
    file?: File;
}

interface QueueContextType {
    queue: QueueItem[];
    addToQueue: (files: File[], sessionId: string, model: VisionModel) => void;
    isProcessing: boolean;
    activeJobId: string | null;
    setActiveJobId: (id: string | null) => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const LS_KEY = 'processing_queue_v1';

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize from localStorage if available
    const [queue, setQueue] = useState<QueueItem[]>(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const { toast } = useToast();

    // Persist queue changes
    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(queue));
    }, [queue]);

    // --- 1. ADD & UPLOAD LOGIC ---
    const addToQueue = useCallback(async (files: File[], sessionId: string, model: VisionModel) => {
        const newItems: QueueItem[] = files.map(f => ({
            id: Math.random().toString(36).substring(7),
            filename: f.name,
            sessionId,
            model,
            status: 'pending_upload',
            file: f
        }));

        setQueue(prev => [...prev, ...newItems]);

        // Fire & Forget Uploads (Parallel)
        newItems.forEach(async (item) => {
            try {
                // Update to uploading
                setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

                if (!item.file) throw new Error("File missing");

                await uploadFile(item.file);

                // Mark as ready for processing
                setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploaded' } : i));

            } catch (e) {
                console.error("Upload failed", e);
                toast({
                    variant: "destructive",
                    title: "Upload Failed",
                    description: `Failed to upload ${item.filename}`
                });
                // Remove failed
                setQueue(q => q.filter(i => i.id !== item.id));
            }
        });
    }, [toast]);

    // --- 2. PROCESSING LOOP ---
    // Single loop that checks the head of the queue
    // --- 2. PROCESSING LOOP ---
    // Single loop that checks the head of the queue
    useEffect(() => {
        const processLoop = async () => {
            if (queue.length === 0) return;

            const head = queue[0];
            if (!head) return;

            // If head is still uploading, we wait.
            if (head.status === 'pending_upload' || head.status === 'uploading') return;

            // If head is 'uploaded', we try to start the job
            if (head.status === 'uploaded') {
                try {
                    // Check if backend is busy first? 
                    // Assume 'startJob' handles queueing or rejection.
                    // If backend is busy with THIS collection, we should get 'already_queued'.

                    const res = await startJob(head.sessionId, head.filename, head.model);

                    if (res.status === 'queued' || res.status === 'processing' || res.status === 'already_queued') {
                        // Mark as processing
                        setQueue(q => q.map(i => i.id === head.id ? { ...i, status: 'processing' } : i));
                        setActiveJobId(head.sessionId);
                    }
                } catch (e) {
                    console.error("Start job failed", e);
                    // If status 400 (already running), we might want to just set status='processing' and wait?
                    // For now, retry in next loop or mark error?
                    // Let's assume transient error and wait, or remove if fatal.
                }
                return;
            }

            // If head is 'processing', we poll for status
            if (head.status === 'processing') {
                try {
                    const res = await api.get(`/collections/${head.sessionId}/status`);
                    const status = res.data;

                    if (status.status === 'completed') {
                        toast({ title: "Processing Complete", description: `${head.filename} is ready for querying.` });
                        // Remove from queue
                        setQueue(q => q.slice(1));
                        setActiveJobId(null);
                    } else if (status.status === 'error') {
                        toast({ variant: "destructive", title: "Error", description: status.step || "Processing failed" });
                        setQueue(q => q.slice(1));
                        setActiveJobId(null);
                    } else {
                        // Still processing, ensure activeJobId is set
                        if (activeJobId !== head.sessionId) setActiveJobId(head.sessionId);
                    }
                } catch (e) {
                    // Poll failed
                }
            }
        };

        const timer = setInterval(processLoop, 2000); // Check every 2s
        return () => clearInterval(timer);
    }, [queue, activeJobId, toast]);

    return (
        <QueueContext.Provider value={{
            queue,
            addToQueue,
            isProcessing: queue.length > 0 && queue[0]?.status === 'processing',
            activeJobId,
            setActiveJobId
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
