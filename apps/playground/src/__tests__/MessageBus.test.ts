import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageBus } from '../core/MessageBus';
import { Agent, AgentMessage, AgentResponse, Capability } from '../core/AgentProtocol';

// Mock console.log to avoid cluttering test output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

describe('MessageBus', () => {
    let messageBus: MessageBus;
    let mockAgent1: Agent;
    let mockAgent2: Agent;
    let mockAgent3: Agent;

    beforeEach(() => {
        messageBus = new MessageBus();
        consoleSpy.mockClear();

        // Create mock agents with different capabilities
        mockAgent1 = {
            id: 'agent-1',
            name: 'Test Agent 1',
            capabilities: [
                { name: 'chat', description: 'Can chat with users' },
                { name: 'search', description: 'Can search the web' }
            ],
            receiveMessage: vi.fn().mockResolvedValue({
                from: 'agent-1',
                to: 'user',
                content: 'Hello from agent 1',
                traceId: 'trace-123'
            })
        };

        mockAgent2 = {
            id: 'agent-2',
            name: 'Test Agent 2',
            capabilities: [
                { name: 'chat', description: 'Can chat with users' },
                { name: 'database', description: 'Can access database' }
            ],
            receiveMessage: vi.fn().mockResolvedValue({
                from: 'agent-2',
                to: 'user',
                content: 'Hello from agent 2',
                traceId: 'trace-456'
            })
        };

        mockAgent3 = {
            id: 'agent-3',
            name: 'Test Agent 3',
            capabilities: [
                { name: 'database', description: 'Can access database' }
            ],
            receiveMessage: vi.fn().mockResolvedValue({
                from: 'agent-3',
                to: 'user',
                content: 'Hello from agent 3',
                traceId: 'trace-789'
            })
        };
    });

    describe('register', () => {
        it('should register an agent successfully', () => {
            messageBus.register(mockAgent1);
            const agents = messageBus.listAgents();

            expect(agents).toContain('agent-1');
            expect(agents).toHaveLength(1);
        });

        it('should register multiple agents', () => {
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);
            messageBus.register(mockAgent3);

            const agents = messageBus.listAgents();
            expect(agents).toContain('agent-1');
            expect(agents).toContain('agent-2');
            expect(agents).toContain('agent-3');
            expect(agents).toHaveLength(3);
        });

        it('should overwrite agent with same ID', () => {
            messageBus.register(mockAgent1);

            const updatedAgent1 = {
                ...mockAgent1,
                name: 'Updated Agent 1',
                capabilities: [{ name: 'new-capability', description: 'New capability' }]
            };

            messageBus.register(updatedAgent1);
            const agents = messageBus.listAgents();

            expect(agents).toContain('agent-1');
            expect(agents).toHaveLength(1);
        });
    });

    describe('send', () => {
        beforeEach(() => {
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);
        });

        it('should send message to registered agent successfully', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'agent-1',
                content: 'Hello agent 1',
                traceId: 'trace-123'
            };

            const response = await messageBus.send(message);

            expect(mockAgent1.receiveMessage).toHaveBeenCalledWith(message);
            expect(response).toEqual({
                from: 'agent-1',
                to: 'user',
                content: 'Hello from agent 1',
                traceId: 'trace-123'
            });
            expect(consoleSpy).toHaveBeenCalledWith('[DISPATCH] [trace-123] user → agent-1');
        });

        it('should throw error when sending to non-existent agent', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'non-existent-agent',
                content: 'Hello non-existent agent',
                traceId: 'trace-123'
            };

            await expect(messageBus.send(message)).rejects.toThrow('Agent non-existent-agent not found');
        });

        it('should preserve traceId in response', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'agent-1',
                content: 'Test message',
                traceId: 'custom-trace-id'
            };

            const response = await messageBus.send(message);

            expect(response.traceId).toBe('custom-trace-id');
        });

        it('should handle message without traceId', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'agent-1',
                content: 'Test message without traceId'
            };

            const response = await messageBus.send(message);

            expect(response.traceId).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith('[DISPATCH] [undefined] user → agent-1');
        });

        it('should handle message with all optional fields', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'agent-1',
                content: 'Test message with all fields',
                traceId: 'trace-123',
                conversationId: 'conv-456',
                parentId: 'parent-789',
                metadata: {
                    hops: ['hop1', 'hop2'],
                    depth: 2,
                    deadline: Date.now() + 5000
                }
            };

            const response = await messageBus.send(message);

            expect(mockAgent1.receiveMessage).toHaveBeenCalledWith(message);
            expect(response.traceId).toBe('trace-123');
        });

        it('should handle async agent response', async () => {
            const delayedResponse: AgentResponse = {
                from: 'agent-1',
                to: 'user',
                content: 'Delayed response',
                traceId: 'trace-123'
            };

            mockAgent1.receiveMessage = vi.fn().mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(delayedResponse), 10))
            );

            const message: AgentMessage = {
                from: 'user',
                to: 'agent-1',
                content: 'Test async response',
                traceId: 'trace-123'
            };

            const response = await messageBus.send(message);

            expect(response).toEqual(delayedResponse);
        });
    });

    describe('getAgentsByCapability', () => {
        beforeEach(() => {
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);
            messageBus.register(mockAgent3);
        });

        it('should return agents with matching capability', () => {
            const chatAgents = messageBus.getAgentsByCapability('chat');

            expect(chatAgents).toHaveLength(2);
            expect(chatAgents.map(agent => agent.id)).toContain('agent-1');
            expect(chatAgents.map(agent => agent.id)).toContain('agent-2');
            expect(chatAgents.map(agent => agent.id)).not.toContain('agent-3');
        });

        it('should return agents with database capability', () => {
            const databaseAgents = messageBus.getAgentsByCapability('database');

            expect(databaseAgents).toHaveLength(2);
            expect(databaseAgents.map(agent => agent.id)).toContain('agent-2');
            expect(databaseAgents.map(agent => agent.id)).toContain('agent-3');
            expect(databaseAgents.map(agent => agent.id)).not.toContain('agent-1');
        });

        it('should return empty array for non-existent capability', () => {
            const nonExistentAgents = messageBus.getAgentsByCapability('non-existent');

            expect(nonExistentAgents).toHaveLength(0);
            expect(nonExistentAgents).toEqual([]);
        });

        it('should return empty array when no agents are registered', () => {
            const emptyMessageBus = new MessageBus();
            const agents = emptyMessageBus.getAgentsByCapability('chat');

            expect(agents).toHaveLength(0);
            expect(agents).toEqual([]);
        });

        it('should handle case-sensitive capability matching', () => {
            const chatAgents = messageBus.getAgentsByCapability('Chat');

            expect(chatAgents).toHaveLength(0);
            expect(chatAgents).toEqual([]);
        });
    });

    describe('getFirstAgentByCapability', () => {
        beforeEach(() => {
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);
            messageBus.register(mockAgent3);
        });

        it('should return first agent with matching capability', () => {
            const firstChatAgent = messageBus.getFirstAgentByCapability('chat');

            expect(firstChatAgent).toBeDefined();
            expect(firstChatAgent?.id).toBe('agent-1');
            expect(firstChatAgent?.capabilities.some(c => c.name === 'chat')).toBe(true);
        });

        it('should return first agent with database capability', () => {
            const firstDatabaseAgent = messageBus.getFirstAgentByCapability('database');

            expect(firstDatabaseAgent).toBeDefined();
            expect(firstDatabaseAgent?.id).toBe('agent-2');
            expect(firstDatabaseAgent?.capabilities.some(c => c.name === 'database')).toBe(true);
        });

        it('should return undefined for non-existent capability', () => {
            const nonExistentAgent = messageBus.getFirstAgentByCapability('non-existent');

            expect(nonExistentAgent).toBeUndefined();
        });

        it('should return undefined when no agents are registered', () => {
            const emptyMessageBus = new MessageBus();
            const agent = emptyMessageBus.getFirstAgentByCapability('chat');

            expect(agent).toBeUndefined();
        });
    });

    describe('listAgents', () => {
        it('should return empty array when no agents are registered', () => {
            const agents = messageBus.listAgents();

            expect(agents).toEqual([]);
            expect(agents).toHaveLength(0);
        });

        it('should return all registered agent IDs', () => {
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);
            messageBus.register(mockAgent3);

            const agents = messageBus.listAgents();

            expect(agents).toContain('agent-1');
            expect(agents).toContain('agent-2');
            expect(agents).toContain('agent-3');
            expect(agents).toHaveLength(3);
        });

        it('should return agent IDs in registration order', () => {
            messageBus.register(mockAgent3);
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);

            const agents = messageBus.listAgents();

            expect(agents[0]).toBe('agent-3');
            expect(agents[1]).toBe('agent-1');
            expect(agents[2]).toBe('agent-2');
        });
    });

    describe('integration', () => {
        it('should handle complete message flow with multiple agents', async () => {
            // Register agents
            messageBus.register(mockAgent1);
            messageBus.register(mockAgent2);
            messageBus.register(mockAgent3);

            // Verify agent listing
            const agents = messageBus.listAgents();
            expect(agents).toHaveLength(3);

            // Test capability filtering
            const chatAgents = messageBus.getAgentsByCapability('chat');
            expect(chatAgents).toHaveLength(2);

            const databaseAgents = messageBus.getAgentsByCapability('database');
            expect(databaseAgents).toHaveLength(2);

            // Test first agent by capability
            const firstChatAgent = messageBus.getFirstAgentByCapability('chat');
            expect(firstChatAgent?.id).toBe('agent-1');

            // Test message sending
            const message: AgentMessage = {
                from: 'user',
                to: 'agent-1',
                content: 'Integration test message',
                traceId: 'integration-trace'
            };

            const response = await messageBus.send(message);
            expect(response.traceId).toBe('integration-trace');
            expect(response.from).toBe('agent-1');
        });

        it('should handle agent replacement', () => {
            messageBus.register(mockAgent1);
            expect(messageBus.listAgents()).toContain('agent-1');

            // Replace agent with same ID but different capabilities
            const replacementAgent: Agent = {
                id: 'agent-1',
                name: 'Replacement Agent 1',
                capabilities: [{ name: 'new-capability', description: 'New capability' }],
                receiveMessage: vi.fn().mockResolvedValue({
                    from: 'agent-1',
                    to: 'user',
                    content: 'Replacement response',
                    traceId: 'trace-123'
                })
            };

            messageBus.register(replacementAgent);

            const agents = messageBus.listAgents();
            expect(agents).toHaveLength(1);
            expect(agents).toContain('agent-1');

            // Verify capability change
            const newCapabilityAgents = messageBus.getAgentsByCapability('new-capability');
            expect(newCapabilityAgents).toHaveLength(1);
            expect(newCapabilityAgents[0].id).toBe('agent-1');

            const chatAgents = messageBus.getAgentsByCapability('chat');
            expect(chatAgents).toHaveLength(0);
        });
    });
}); 