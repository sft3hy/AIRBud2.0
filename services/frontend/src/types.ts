export interface Group {
    id: number;
    name: string;
    description: string;
    is_public: boolean;
    invite_token: string;
    owner_id: number;
    owner_name: string;
    member_count: number;
    created_at: string;
}

export interface CollectionSummary {
    id: number;
    name: string;
    created_at: string;
    docs: number;
    owner_id: number;
    owner_name: string; // New
    group_id?: number; // New
    group_name?: string; // New
}

// ... existing types ...
export interface SessionDocument {
    id: number;
    original_filename: string;
    vision_model_used: string;
    chart_dir?: string;
    chart_descriptions?: string | Record<string, string>;
    chart_descriptions_json?: string | Record<string, string>;
}

export interface SearchResult {
    type?: 'text' | 'graph';
    text: string;
    source: string;
    page?: number;
    score?: number;
}

export interface GraphNode {
    id: string;
    group: string;
    type?: string;
}

export interface GraphLink {
    source: string;
    target: string;
    label: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
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
    | 'Ollama-Granite3.2-Vision'
    | 'Moondream2'
    | 'Ollama-Gemma3'
    | 'Ollama-Ministral-3-3B';

export interface Group {
    id: number;
    name: string;
    description: string;
    is_public: boolean;
    invite_token: string;
    owner_id: number;
    owner_name: string;
    member_count: number;
    created_at: string;
    is_member?: boolean; // NEW field
}

export type SidebarMode = 'collections' | 'groups'

export interface JobStatus {
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'error';
    stage: 'parsing' | 'vision' | 'indexing' | 'graph' | 'done' | 'error'; // NEW
    step: string;
    progress: number;
    details?: {
        logs?: string[];
        current_file?: string;
        current_image_idx?: number;
        total_images?: number;
    };
}