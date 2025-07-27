import { describe, it, expect, beforeEach } from 'vitest';

import { AgentMemory, MemoryStore } from '../core/AgentMemory';
import { MemoryEntry } from '../core/AgentProtocol';

// Mock memory store for testing
class MockMemoryStore implements MemoryStore {
  private data: Map<string, MemoryEntry[]> = new Map();

  record(traceId: string, entry: MemoryEntry): void {
    if (!this.data.has(traceId)) {
      this.data.set(traceId, []);
    }
    this.data.get(traceId)!.push(entry);
  }

  recall(traceId: string): MemoryEntry[] {
    return this.data.get(traceId) || [];
  }

  // Helper method to clear data between tests
  clear(): void {
    this.data.clear();
  }
}

describe('AgentMemory', () => {
  let agentMemory: AgentMemory;
  let mockStore: MockMemoryStore;

  beforeEach(() => {
    mockStore = new MockMemoryStore();
    agentMemory = new AgentMemory(mockStore);
  });

  describe('record', () => {
    it('should record a memory entry for a new trace ID', () => {
      const traceId = 'trace-123';
      const entry: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Hello there',
        timestamp: Date.now(),
      };

      agentMemory.record(traceId, entry);
      const recalled = agentMemory.recall(traceId);

      expect(recalled).toHaveLength(1);
      expect(recalled[0]).toEqual(entry);
    });

    it('should append memory entries to existing trace ID', () => {
      const traceId = 'trace-123';
      const entry1: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Hello there',
        timestamp: Date.now(),
      };
      const entry2: MemoryEntry = {
        direction: 'received',
        peer: 'agent-2',
        content: 'Hi back!',
        conversationId: 'conv-456',
        timestamp: Date.now() + 1000,
      };

      agentMemory.record(traceId, entry1);
      agentMemory.record(traceId, entry2);
      const recalled = agentMemory.recall(traceId);

      expect(recalled).toHaveLength(2);
      expect(recalled[0]).toEqual(entry1);
      expect(recalled[1]).toEqual(entry2);
    });

    it('should handle multiple trace IDs independently', () => {
      const traceId1 = 'trace-123';
      const traceId2 = 'trace-456';
      const entry1: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Message for trace 1',
        timestamp: Date.now(),
      };
      const entry2: MemoryEntry = {
        direction: 'received',
        peer: 'agent-2',
        content: 'Message for trace 2',
        timestamp: Date.now() + 1000,
      };

      agentMemory.record(traceId1, entry1);
      agentMemory.record(traceId2, entry2);

      const recalled1 = agentMemory.recall(traceId1);
      const recalled2 = agentMemory.recall(traceId2);

      expect(recalled1).toHaveLength(1);
      expect(recalled1[0]).toEqual(entry1);
      expect(recalled2).toHaveLength(1);
      expect(recalled2[0]).toEqual(entry2);
    });

    it('should handle memory entries with all optional fields', () => {
      const traceId = 'trace-123';
      const entry: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Test message',
        conversationId: 'conv-789',
        timestamp: 1234567890,
      };

      agentMemory.record(traceId, entry);
      const recalled = agentMemory.recall(traceId);

      expect(recalled).toHaveLength(1);
      expect(recalled[0]).toEqual(entry);
    });

    it('should handle memory entries with minimal required fields', () => {
      const traceId = 'trace-123';
      const entry: MemoryEntry = {
        direction: 'received',
        peer: 'agent-1',
        content: 'Minimal message',
        timestamp: Date.now(),
      };

      agentMemory.record(traceId, entry);
      const recalled = agentMemory.recall(traceId);

      expect(recalled).toHaveLength(1);
      expect(recalled[0]).toEqual(entry);
    });
  });

  describe('recall', () => {
    it('should return empty array for non-existent trace ID', () => {
      const nonExistentTraceId = 'non-existent-trace';
      const recalled = agentMemory.recall(nonExistentTraceId);

      expect(recalled).toEqual([]);
      expect(recalled).toHaveLength(0);
    });

    it('should return empty array for empty string trace ID', () => {
      const recalled = agentMemory.recall('');

      expect(recalled).toEqual([]);
      expect(recalled).toHaveLength(0);
    });

    it('should return all entries for a trace ID in order of recording', () => {
      const traceId = 'trace-123';
      const entries: MemoryEntry[] = [
        {
          direction: 'sent',
          peer: 'agent-1',
          content: 'First message',
          timestamp: Date.now(),
        },
        {
          direction: 'received',
          peer: 'agent-2',
          content: 'Second message',
          timestamp: Date.now() + 1000,
        },
        {
          direction: 'sent',
          peer: 'agent-1',
          content: 'Third message',
          timestamp: Date.now() + 2000,
        },
      ];

      entries.forEach((entry) => agentMemory.record(traceId, entry));
      const recalled = agentMemory.recall(traceId);

      expect(recalled).toHaveLength(3);
      expect(recalled).toEqual(entries);
    });

    it('should return different results for different trace IDs', () => {
      const traceId1 = 'trace-1';
      const traceId2 = 'trace-2';
      const entry1: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Message 1',
        timestamp: Date.now(),
      };
      const entry2: MemoryEntry = {
        direction: 'received',
        peer: 'agent-2',
        content: 'Message 2',
        timestamp: Date.now() + 1000,
      };

      agentMemory.record(traceId1, entry1);
      agentMemory.record(traceId2, entry2);

      const recalled1 = agentMemory.recall(traceId1);
      const recalled2 = agentMemory.recall(traceId2);

      expect(recalled1).toEqual([entry1]);
      expect(recalled2).toEqual([entry2]);
      expect(recalled1).not.toEqual(recalled2);
    });
  });

  describe('integration', () => {
    it('should maintain data integrity across multiple operations', () => {
      const traceId = 'trace-123';
      const entry1: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Initial message',
        timestamp: Date.now(),
      };

      // Record first entry
      agentMemory.record(traceId, entry1);
      let recalled = agentMemory.recall(traceId);
      expect(recalled).toEqual([entry1]);

      // Record second entry
      const entry2: MemoryEntry = {
        direction: 'received',
        peer: 'agent-2',
        content: 'Response message',
        timestamp: Date.now() + 1000,
      };
      agentMemory.record(traceId, entry2);
      recalled = agentMemory.recall(traceId);
      expect(recalled).toEqual([entry1, entry2]);

      // Record third entry
      const entry3: MemoryEntry = {
        direction: 'sent',
        peer: 'agent-1',
        content: 'Final message',
        conversationId: 'conv-123',
        timestamp: Date.now() + 2000,
      };
      agentMemory.record(traceId, entry3);
      recalled = agentMemory.recall(traceId);
      expect(recalled).toEqual([entry1, entry2, entry3]);
    });

    it('should handle concurrent trace IDs without interference', () => {
      const traceIds = ['trace-1', 'trace-2', 'trace-3'];
      const entries: MemoryEntry[] = [];

      // Create entries for each trace
      traceIds.forEach((traceId, index) => {
        const entry: MemoryEntry = {
          direction: index % 2 === 0 ? 'sent' : 'received',
          peer: `agent-${index + 1}`,
          content: `Message for trace ${index + 1}`,
          timestamp: Date.now() + index * 1000,
        };
        entries.push(entry);
        agentMemory.record(traceId, entry);
      });

      // Verify each trace has its own entry
      traceIds.forEach((traceId, index) => {
        const recalled = agentMemory.recall(traceId);
        expect(recalled).toEqual([entries[index]]);
      });
    });
  });
});
