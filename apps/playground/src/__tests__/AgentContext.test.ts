import fs from 'fs';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AgentContext } from '../core/AgentContext';
import { Agent } from '../core/AgentProtocol';
import { MessageBus } from '../core/MessageBus';

// Mock console.log to avoid cluttering test output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

// Mock uuid to return predictable values
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-12345'),
}));

// Helper function to clean up memory files
function cleanupMemoryFiles() {
    const memoryDir = path.join(process.cwd(), 'memory');
    if (fs.existsSync(memoryDir)) {
        const files = fs.readdirSync(memoryDir);
        files.forEach((file) => {
            if (file.endsWith('.json')) {
                fs.unlinkSync(path.join(memoryDir, file));
            }
        });
    }
}

describe('AgentContext', () => {
    let agentContext: AgentContext;
    let mockMessageBus: MessageBus;
    let mockAgent: Agent;

    beforeEach(() => {
        consoleSpy.mockClear();
        cleanupMemoryFiles(); // Clean up memory files before each test

        // Create mock message bus
        mockMessageBus = {
            send: vi.fn(),
            register: vi.fn(),
            getAgentsByCapability: vi.fn(),
            getFirstAgentByCapability: vi.fn(),
            listAgents: vi.fn(),
        } as unknown as MessageBus;

        // Create mock agent
        mockAgent = {
            id: 'test-agent',
            name: 'Test Agent',
            capabilities: [
                { name: 'chat', description: 'Can chat with users' },
                { name: 'search', description: 'Can search the web' },
            ],
            receiveMessage: vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Hello from test agent',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            }),
        };

        agentContext = new AgentContext(mockMessageBus, 'context-agent');
    });

    afterEach(() => {
        cleanupMemoryFiles(); // Clean up memory files after each test
    });

    describe('send', () => {
        beforeEach(() => {
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });
        });

        it('should send message successfully with default options', async () => {
            const response = await agentContext.send(
                'test-agent',
                'Hello test agent'
            );

            expect(mockMessageBus.send).toHaveBeenCalledWith({
                from: 'context-agent',
                to: 'test-agent',
                content: 'Hello test agent',
                traceId: 'mock-uuid-12345',
                conversationId: 'mock-uuid-12345',
                metadata: {
                    hops: ['context-agent'],
                    depth: 1,
                },
            });

            expect(response).toEqual({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[SEND] [mock-uuid-12345] context-agent → test-agent :: Hello test agent'
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                '[RECV] [mock-uuid-12345] test-agent → context-agent :: Response from test agent'
            );
        });

        it('should use provided traceId and conversationId', async () => {
            // Mock the response to use the custom traceId
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'custom-trace',
                conversationId: 'custom-conv',
            });

            const response = await agentContext.send(
                'test-agent',
                'Hello test agent',
                {
                    traceId: 'custom-trace',
                    conversationId: 'custom-conv',
                }
            );

            expect(mockMessageBus.send).toHaveBeenCalledWith({
                from: 'context-agent',
                to: 'test-agent',
                content: 'Hello test agent',
                traceId: 'custom-trace',
                conversationId: 'custom-conv',
                metadata: {
                    hops: ['context-agent'],
                    depth: 1,
                },
            });

            expect(response.traceId).toBe('custom-trace');
        });

        it('should handle message with all optional fields', async () => {
            await agentContext.send(
                'test-agent',
                'Hello test agent',
                {
                    traceId: 'custom-trace',
                    conversationId: 'custom-conv',
                    parentId: 'parent-123',
                    metadata: {
                        hops: ['previous-hop'],
                        depth: 2,
                        deadline: Date.now() + 5000,
                    },
                    stupid: 'User visible message',
                }
            );

            expect(mockMessageBus.send).toHaveBeenCalledWith({
                from: 'context-agent',
                to: 'test-agent',
                content: 'Hello test agent',
                traceId: 'custom-trace',
                conversationId: 'custom-conv',
                parentId: 'parent-123',
                metadata: {
                    hops: ['previous-hop', 'context-agent'],
                    depth: 3,
                    deadline: expect.any(Number),
                },
                stupid: 'User visible message',
            });
        });

        it('should detect and prevent loops', async () => {
            const response = await agentContext.send(
                'test-agent',
                'Hello test agent',
                {
                    metadata: {
                        hops: ['context-agent', 'other-agent', 'context-agent'],
                        depth: 3,
                    },
                }
            );

            expect(response).toEqual({
                from: 'context-agent',
                to: 'test-agent',
                content:
                    '[ERROR] Loop or depth limit reached (depth=4)\nHops: context-agent → other-agent → context-agent → context-agent',
                traceId: 'mock-uuid-12345',
                conversationId: 'mock-uuid-12345',
            });

            expect(mockMessageBus.send).not.toHaveBeenCalled();
        });

        it('should prevent depth limit exceeded', async () => {
            const response = await agentContext.send(
                'test-agent',
                'Hello test agent',
                {
                    metadata: {
                        hops: [
                            'agent1',
                            'agent2',
                            'agent3',
                            'agent4',
                            'agent5',
                            'agent6',
                            'agent7',
                            'agent8',
                            'agent9',
                            'agent10',
                        ],
                        depth: 10,
                    },
                }
            );

            expect(response).toEqual({
                from: 'context-agent',
                to: 'test-agent',
                content:
                    '[ERROR] Loop or depth limit reached (depth=11)\nHops: agent1 → agent2 → agent3 → agent4 → agent5 → agent6 → agent7 → agent8 → agent9 → agent10 → context-agent',
                traceId: 'mock-uuid-12345',
                conversationId: 'mock-uuid-12345',
            });

            expect(mockMessageBus.send).not.toHaveBeenCalled();
        });

        it('should record sent and received messages in memory', async () => {
            await agentContext.send('test-agent', 'Hello test agent', {
                traceId: 'test-trace',
                conversationId: 'test-conv',
            });

            const memory = agentContext.getMemory('test-trace');
            expect(memory).toHaveLength(2);

            // Check sent message
            expect(memory[0]).toEqual({
                direction: 'sent',
                peer: 'test-agent',
                content: 'Hello test agent',
                conversationId: 'test-conv',
                timestamp: expect.any(Number),
            });

            // Check received message
            expect(memory[1]).toEqual({
                direction: 'received',
                peer: 'test-agent',
                content: 'Response from test agent',
                conversationId: 'conv-456',
                timestamp: expect.any(Number),
            });
        });

        it('should handle message bus errors', async () => {
            mockMessageBus.send = vi
                .fn()
                .mockRejectedValue(new Error('Message bus error'));

            await expect(
                agentContext.send('test-agent', 'Hello test agent')
            ).rejects.toThrow('Message bus error');
        });

        it('should handle response with multi-line content for logging', async () => {
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Line 1\nLine 2\nLine 3',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });

            await agentContext.send('test-agent', 'Hello test agent');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[RECV] [mock-uuid-12345] test-agent → context-agent :: Line 1'
            );
        });

        it('should handle empty response content', async () => {
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: '',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });

            await agentContext.send('test-agent', 'Hello test agent');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[RECV] [mock-uuid-12345] test-agent → context-agent :: '
            );
        });
    });

    describe('findAgent', () => {
        it('should return first agent with matching capability', () => {
            mockMessageBus.getFirstAgentByCapability = vi
                .fn()
                .mockReturnValue(mockAgent);

            const agentId = agentContext.findAgent('chat');

            expect(mockMessageBus.getFirstAgentByCapability).toHaveBeenCalledWith(
                'chat'
            );
            expect(agentId).toBe('test-agent');
        });

        it('should return undefined when no agent has capability', () => {
            mockMessageBus.getFirstAgentByCapability = vi
                .fn()
                .mockReturnValue(undefined);

            const agentId = agentContext.findAgent('non-existent');

            expect(mockMessageBus.getFirstAgentByCapability).toHaveBeenCalledWith(
                'non-existent'
            );
            expect(agentId).toBeUndefined();
        });
    });

    describe('findAgents', () => {
        it('should return all agent IDs with matching capability', () => {
            const mockAgents = [
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    capabilities: [],
                    receiveMessage: vi.fn(),
                },
                {
                    id: 'agent-2',
                    name: 'Agent 2',
                    capabilities: [],
                    receiveMessage: vi.fn(),
                },
                {
                    id: 'agent-3',
                    name: 'Agent 3',
                    capabilities: [],
                    receiveMessage: vi.fn(),
                },
            ];

            mockMessageBus.getAgentsByCapability = vi
                .fn()
                .mockReturnValue(mockAgents);

            const agentIds = agentContext.findAgents('chat');

            expect(mockMessageBus.getAgentsByCapability).toHaveBeenCalledWith('chat');
            expect(agentIds).toEqual(['agent-1', 'agent-2', 'agent-3']);
        });

        it('should return empty array when no agents have capability', () => {
            mockMessageBus.getAgentsByCapability = vi.fn().mockReturnValue([]);

            const agentIds = agentContext.findAgents('non-existent');

            expect(mockMessageBus.getAgentsByCapability).toHaveBeenCalledWith(
                'non-existent'
            );
            expect(agentIds).toEqual([]);
        });
    });

    describe('getMemory', () => {
        it('should return memory entries for trace ID', async () => {
            // Ensure mock response is set up
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'test-trace',
                conversationId: 'test-conv',
            });

            await agentContext.send('test-agent', 'Hello test agent', {
                traceId: 'test-trace',
                conversationId: 'test-conv',
            });

            const memory = agentContext.getMemory('test-trace');

            expect(memory).toHaveLength(2);
            expect(memory[0].direction).toBe('sent');
            expect(memory[1].direction).toBe('received');
        });

        it('should return empty array for non-existent trace ID', () => {
            const memory = agentContext.getMemory('non-existent-trace');

            expect(memory).toEqual([]);
        });

        it('should return empty array for empty trace ID', () => {
            const memory = agentContext.getMemory('');

            expect(memory).toEqual([]);
        });
    });

    describe('integration', () => {
        it('should handle complete message flow with memory tracking', async () => {
            // Set up mock response
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'integration-trace',
                conversationId: 'integration-conv',
            });

            // Send a message
            const response = await agentContext.send(
                'test-agent',
                'Integration test message',
                {
                    traceId: 'integration-trace',
                    conversationId: 'integration-conv',
                }
            );

            // Verify response
            expect(response.from).toBe('test-agent');
            expect(response.traceId).toBe('integration-trace');

            // Verify memory was recorded
            const memory = agentContext.getMemory('integration-trace');
            expect(memory).toHaveLength(2);
            expect(memory[0].content).toBe('Integration test message');
            expect(memory[1].content).toBe('Response from test agent');

            // Verify console logging
            expect(consoleSpy).toHaveBeenCalledWith(
                '[SEND] [integration-trace] context-agent → test-agent :: Integration test message'
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                '[RECV] [integration-trace] test-agent → context-agent :: Response from test agent'
            );
        });

        it('should handle multiple messages with different trace IDs', async () => {
            // Set up mock responses
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'trace-1',
                conversationId: 'conv-1',
            });

            // Send first message
            await agentContext.send('test-agent', 'First message', {
                traceId: 'trace-1',
                conversationId: 'conv-1',
            });

            // Update mock for second message
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response from test agent',
                traceId: 'trace-2',
                conversationId: 'conv-2',
            });

            // Send second message
            await agentContext.send('test-agent', 'Second message', {
                traceId: 'trace-2',
                conversationId: 'conv-2',
            });

            // Verify separate memory for each trace
            const memory1 = agentContext.getMemory('trace-1');
            const memory2 = agentContext.getMemory('trace-2');

            expect(memory1).toHaveLength(2);
            expect(memory2).toHaveLength(2);
            expect(memory1[0].content).toBe('First message');
            expect(memory2[0].content).toBe('Second message');
        });

        it('should handle agent discovery and messaging', async () => {
            // Mock agent discovery
            mockMessageBus.getFirstAgentByCapability = vi
                .fn()
                .mockReturnValue(mockAgent);
            mockMessageBus.getAgentsByCapability = vi
                .fn()
                .mockReturnValue([mockAgent]);

            // Set up mock response for messaging
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Message to found agent response',
                traceId: 'discovery-trace',
                conversationId: 'discovery-conv',
            });

            // Find agent by capability
            const agentId = agentContext.findAgent('chat');
            expect(agentId).toBe('test-agent');

            // Find all agents by capability
            const agentIds = agentContext.findAgents('chat');
            expect(agentIds).toEqual(['test-agent']);

            // Send message to found agent
            await agentContext.send(agentId!, 'Message to found agent');
        });
    });

    describe('edge cases', () => {
        it('should handle very long content in logging', async () => {
            const longContent = 'A'.repeat(1000);
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: longContent,
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });

            await agentContext.send('test-agent', 'Hello test agent');

            expect(consoleSpy).toHaveBeenCalledWith(
                `[RECV] [mock-uuid-12345] test-agent → context-agent :: ${longContent.split('\n')[0]}`
            );
        });

        it('should handle special characters in content', async () => {
            const specialContent =
                'Message with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';

            // Set up mock response for this test
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Response with special chars',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });

            await agentContext.send('test-agent', specialContent);

            expect(consoleSpy).toHaveBeenCalledWith(
                `[SEND] [mock-uuid-12345] context-agent → test-agent :: ${specialContent}`
            );
        });

        it('should handle empty content', async () => {
            // Set up mock response for this test
            mockMessageBus.send = vi.fn().mockResolvedValue({
                from: 'test-agent',
                to: 'context-agent',
                content: 'Empty content response',
                traceId: 'trace-123',
                conversationId: 'conv-456',
            });

            await agentContext.send('test-agent', '');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[SEND] [mock-uuid-12345] context-agent → test-agent :: '
            );
        });
    });
});
