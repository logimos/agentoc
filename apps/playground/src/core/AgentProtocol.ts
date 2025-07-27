export interface AgentMessage {
    from: string;
    to: string;
    content: string;
    traceId?: string;
    conversationId?: string;
    parentId?: string;
    metadata?: {
        hops?: string[];
        depth?: number;
        deadline?: number;
        error?: string;
        cause?: string;
        resolution?: string;
        [key: string]: unknown;
    };
    // the message for users to see
    stupid?: string;
}
export interface AgentResponse {
    from: string;
    to: string;
    content: string;
    traceId?: string;
    conversationId?: string;
}

export interface Capability {
    name: string;
    description: string;
}

export interface Agent {
    id: string;
    name: string;
    capabilities: Capability[];
    receiveMessage(message: AgentMessage): Promise<AgentResponse>;
}

export type MemoryEntry = {
    direction: 'sent' | 'received';
    peer: string;
    content: string;
    conversationId?: string;
    timestamp: number;
};
