import { AgentMessage, AgentResponse, MemoryEntry } from './AgentProtocol'
import { MessageBus } from './MessageBus'
import { AgentMemory, MemoryStore } from './AgentMemory'
import { v4 as uuidv4 } from 'uuid'

export class AgentContext {
    private memory: AgentMemory

    constructor(private bus: MessageBus, private selfId: string, memoryStore?: MemoryStore) {
        this.memory = new AgentMemory(memoryStore)
    }

    async send(to: string, content: string, opts?: Partial<AgentMessage>): Promise<AgentResponse> {
        const traceId = opts?.traceId ?? uuidv4()
        const conversationId = opts?.conversationId ?? uuidv4()
        const previousHops = opts?.metadata?.hops ?? []
        const newDepth = (opts?.metadata?.depth ?? 0) + 1

        if (previousHops.includes(this.selfId) || newDepth > 10) {
            return {
                from: this.selfId,
                to,
                content: `[ERROR] Loop or depth limit reached (depth=${newDepth})\nHops: ${[...previousHops, this.selfId].join(' → ')}`,
                traceId,
                conversationId
            }
        }

        const message: AgentMessage = {
            from: this.selfId,
            to,
            content,
            traceId,
            conversationId,
            parentId: opts?.parentId,
            metadata: {
                ...opts?.metadata,
                hops: [...previousHops, this.selfId],
                depth: newDepth
            },
            stupid: opts?.stupid
        }

        console.log(`[SEND] [${traceId}] ${message.from} → ${message.to} :: ${content}`)
        this.memory.record(traceId, {
            direction: 'sent',
            peer: to,
            content,
            conversationId,
            timestamp: Date.now()
        })

        const response = await this.bus.send(message)

        this.memory.record(traceId, {
            direction: 'received',
            peer: response.from,
            content: response.content,
            conversationId: response.conversationId,
            timestamp: Date.now()
        })

        console.log(`[RECV] [${traceId}] ${response.from} → ${response.to} :: ${response.content.split('\n')[0]}`)

        return response
    }

    findAgent(capability: string): string | undefined {
        const agent = this.bus.getFirstAgentByCapability(capability)
        return agent?.id
    }

    findAgents(capability: string): string[] {
        return this.bus.getAgentsByCapability(capability).map(a => a.id)
    }

    getMemory(traceId: string): MemoryEntry[] {
        return this.memory.recall(traceId)
    }
}
