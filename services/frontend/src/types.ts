export interface CollectionSummary {
    id: number;
    name: string;
    created_at: string;
    docs: number;
}

export interface SessionDocument {
    id: number; // Added ID for deletion
    original_filename: string;
    vision_model_used: string;
    chart_dir?: string;
    chart_descriptions?: string | Record<string, string>;
    chart_descriptions_json?: string | Record<string, string>;
}

export interface SearchResult {
    text: string;
    source: string;
    page?: number;
    score?: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: SearchResult[];
}

export interface QueryResponse {
    response: string;
    results: SearchResult[];
    error?: string;
}

export interface JobStatus {
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'error';
    step: string;
    progress: number;
}

export interface SessionHistoryItem {
    question: string;
    response: string;
    sources?: SearchResult[];
    results?: SearchResult[];
}

export type VisionModel =
    | 'Moondream2'
    | 'Qwen3-VL-2B'
    | 'InternVL3.5-1B'
    | 'Ollama-Gemma3'
    | 'Ollama-Granite3.2-Vision';