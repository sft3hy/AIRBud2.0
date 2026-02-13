import axios, { AxiosError } from 'axios';
import { SessionDocument, QueryResponse, CollectionSummary, JobStatus, SessionHistoryItem, Group, GraphData } from '../types';
import { config } from './config';
import { logger } from './logger';

export interface UserProfile {
    id: number;
    display_name?: string;
    organization?: string;
    piv_id?: string | null;
    cn?: string;
    org?: string;
    email?: string;
}

export const api = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: 300000, // 5 minutes (needed for large video uploads)
});

// --- RETRY LOGIC (Resilience for 100+ users) ---
// Retries idempotent requests (GET) on 5xx errors or network failures
api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
        const { config: originalRequest, response } = error;

        // Check if config exists and we haven't retried too many times
        if (originalRequest && originalRequest.method?.toLowerCase() === 'get' && !originalRequest.headers['X-Retry']) {
            const status = response?.status;
            // Retry on Network Error or 5xx Server Errors
            if (!status || (status >= 500 && status < 600)) {
                // Limit to 1 retry to avoid thrashing
                originalRequest.headers['X-Retry'] = 'true';

                // Exponential backoff wait (500ms)
                await new Promise(resolve => setTimeout(resolve, 500));

                // Suppress log for initial retry
                // logger.warn(`Retrying request: ${originalRequest.url}`);
                return api(originalRequest);
            }
        }

        // Only log if it's NOT a cancellation and NOT a standard network error (which the browser logs anyway)
        if (error.code !== "ERR_CANCELED" && error.code !== "ERR_NETWORK") {
            // Suppress annoying connection errors during dev/restarts
            if (error.message !== "Network Error") {
                logger.error(`API Error: ${error.config?.url}`, error.message);
            }
        }
        return Promise.reject(error);
    }
);

// --- System Info ---
export interface SystemStatus {
    online: boolean;
    llm_model?: string;
    llm_provider?: string;
    user?: UserProfile;
    dependencies?: Record<string, string>;
}

export const fetchSystemStatus = async (): Promise<SystemStatus> => {
    try {
        const { data } = await api.get(config.endpoints.health, { timeout: 5000 });

        if (data.status === "outage") {
            return {
                online: false,
                user: data.user,
                dependencies: data.dependencies
            };
        }

        return {
            online: true,
            llm_model: data.llm_model,
            llm_provider: data.llm_provider,
            user: data.user,
            dependencies: data.dependencies
        };
    } catch (e) {
        return {
            online: false,
            dependencies: {
                "Rag Core (API)": "offline",
                "PostgreSQL": "unknown",
                "Knowledge Graph": "unknown",
                "Parser (Layout)": "unknown",
                "Vision (AI)": "unknown",
            }
        };
    }
};

// --- Groups ---
export const getMyGroups = async (): Promise<Group[]> => {
    const { data } = await api.get('/groups');
    return data;
};

export const getPublicGroups = async (): Promise<Group[]> => {
    const { data } = await api.get('/groups/public');
    return data;
};

export const createGroup = async (name: string, description: string, is_public: boolean) => {
    const { data } = await api.post('/groups', { name, description, is_public });
    return data;
};

export const joinGroup = async (token: string) => {
    const { data } = await api.post(`/groups/join/${token}`);
    return data;
};

export const joinPublicGroup = async (gid: number) => {
    await api.post(`/groups/public/${gid}/join`);
};

export const leaveGroup = async (gid: number) => {
    await api.post(`/groups/${gid}/leave`);
};

export const deleteGroup = async (gid: number) => {
    await api.delete(`/groups/${gid}`);
};

export const updateGroup = async (gid: number, name: string, description: string) => {
    await api.put(`/groups/${gid}`, { name, description });
};

// --- Collections ---
export const getCollections = async (): Promise<CollectionSummary[]> => {
    try {
        const { data } = await api.get<CollectionSummary[]>('/collections');
        return data;
    } catch (e) {
        logger.error("Failed to fetch collections", e);
        throw e;
    }
};

export const createCollection = async (name: string, group_id?: number): Promise<string> => {
    const { data } = await api.post<{ id: number }>('/collections', { name, group_id });
    return String(data.id);
};

export const deleteCollection = async (cid: number) => {
    await api.delete(`/collections/${cid}`);
};

export const renameCollection = async (cid: number, name: string) => {
    await api.put(`/collections/${cid}`, { name });
};

export const getCollectionStatus = async (cid: string): Promise<JobStatus> => {
    try {
        const { data } = await api.get<JobStatus>(`/collections/${cid}/status`);
        return data;
    } catch (e) {
        return {
            status: 'error',
            stage: 'error',
            step: 'Connection failed',
            progress: 0
        };
    }
};

// --- Documents ---
export const fetchCollectionDocuments = async (cid: string): Promise<SessionDocument[]> => {
    try {
        const { data } = await api.get<SessionDocument[]>(`/collections/${cid}/documents`);
        return data;
    } catch (e) {
        logger.warn(`Failed to fetch documents for collection ${cid}`, e);
        return [];
    }
};

export const deleteDocument = async (docId: number) => {
    await api.delete(`/documents/${docId}`);
};

// --- Upload with Streaming Progress ---
// --- Upload with Streaming Progress ---
export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(config.endpoints.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000 // 10 mins
    });
    return data;
};

export const startJob = async (cid: string, filename: string, visionModel: string) => {
    const { data } = await api.post(config.endpoints.process, {
        collection_id: parseInt(cid),
        filename: filename,
        vision_model: visionModel
    });
    return data;
};

export const uploadAndProcessDocument = async (cid: string, file: File, visionModel: string) => {
    // Legacy wrapper if needed, but we prefer splitting them
    await uploadFile(file);
    return await startJob(cid, file.name, visionModel);
};

// --- Chat & History ---
export const getCollectionHistory = async (cid: string): Promise<SessionHistoryItem[]> => {
    try {
        const { data } = await api.get<SessionHistoryItem[]>(`/collections/${cid}/history`);
        return data;
    } catch (e) {
        return [];
    }
};

export const sendQueryStream = async (
    cid: string,
    question: string,
    onStatusUpdate: (status: string) => void
): Promise<QueryResponse> => {

    // Use raw fetch for streaming
    const response = await fetch(`${config.apiBaseUrl.replace('/api', '')}/api/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collection_id: parseInt(cid), question })
    });

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: QueryResponse | null = null;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            // Keep incomplete chunks
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data = JSON.parse(line);

                    if (data.step) onStatusUpdate(data.step);
                    if (data.result) finalResult = data.result;
                    if (data.error) throw new Error(data.error);
                } catch (e) {
                    // Swallow JSON parse errors for partial chunks (common under load)
                    if (line.includes("}")) console.warn("Stream parse error (likely partial chunk)", e);
                }
            }
        }
    } catch (e) {
        logger.error("Stream interrupted", e);
        throw e;
    } finally {
        reader.releaseLock();
    }

    if (!finalResult) throw new Error("Stream ended without result");
    return finalResult;
};

export const getCollectionCharts = async (cid: string) => {
    try {
        const { data } = await api.get(`/collections/${cid}/charts`);
        return data;
    } catch (e) {
        return [];
    }
};

export const getCollectionGraph = async (cid: string): Promise<GraphData> => {
    try {
        // --- PRODUCTION FIX: Use Nginx Proxy Path ---
        // Route through /graph-api to reach the kg_service container via Nginx
        // This avoids CORS issues and exposed ports
        const response = await axios.get(`${import.meta.env.BASE_URL}graph-api/collections/${cid}/graph`, {
            timeout: 10000 // 10s timeout for heavy graph queries
        });
        return response.data;
    } catch (e) {
        logger.warn("Graph fetch failed (Graph might be empty or service busy)", e);
        return { nodes: [], links: [] };
    }
};

export const getDocumentPreview = async (docId: number): Promise<string> => {
    try {
        const { data } = await api.get<{ content: string }>(`/documents/${docId}/preview`);
        return data.content;
    } catch (e) {
        console.error("Failed to fetch preview", e);
        return "# Error\n\nCould not load document preview.";
    }
};