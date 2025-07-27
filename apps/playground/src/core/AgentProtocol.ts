
export interface AgentMessage {
    from: string
    to: string
    content: string
    metadata?: Record<string, any>
}

export interface AgentResponse {
    from: string
    to: string
    content: string
}

export interface Agent {
    id: string
    name: string
    receiveMessage(message: AgentMessage): Promise<AgentResponse>
}
