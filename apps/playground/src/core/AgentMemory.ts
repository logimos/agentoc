import { MemoryEntry } from './AgentProtocol'

export class AgentMemory {
    private store = new Map<string, MemoryEntry[]>()

    record(traceId: string, entry: MemoryEntry) {
        if (!this.store.has(traceId)) {
            this.store.set(traceId, [])
        }
        this.store.get(traceId)!.push(entry)
    }

    recall(traceId: string): MemoryEntry[] {
        return this.store.get(traceId) ?? []
    }
}