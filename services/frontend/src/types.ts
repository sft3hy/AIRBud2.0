export interface SessionDocument {
    id?: string;
    original_filename: string;
    vision_model_used?: string;
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

export interface SessionSummary {
    id: string;
    name: string;
    docs: number;
    created_at: string;
}

export interface SessionHistoryItem {
    question: string;
    response: string;
    sources?: SearchResult[];
    results?: SearchResult[]; // Backend sometimes returns this alias
}

export type VisionModel =
    | 'Moondream2'
    | 'Qwen3-VL-2B'
    | 'InternVL3.5-1B'
    | 'Ollama-Gemma3'
    | 'Ollama-Granite3.2-Vision';

export interface JobStatus {
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'error';
    step: string;
    progress: number;
}