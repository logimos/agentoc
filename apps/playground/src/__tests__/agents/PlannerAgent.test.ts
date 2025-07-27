import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PlannerAgent } from '../../agents/PlannerAgent';
import { AgentContext } from '../../core/AgentContext';
import { AgentMessage } from '../../core/AgentProtocol';
import { MessageBus } from '../../core/MessageBus';

// Mock console.log to avoid cluttering test output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

// Mock uuid to return predictable values
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-12345'),
}));

describe('PlannerAgent', () => {
    let plannerAgent: PlannerAgent;
    let mockMessageBus: MessageBus;
    let mockContext: AgentContext;

    beforeEach(() => {
        consoleSpy.mockClear();

        // Create mock message bus
        mockMessageBus = {
            send: vi.fn(),
            register: vi.fn(),
            getAgentsByCapability: vi.fn(),
            getFirstAgentByCapability: vi.fn(),
            listAgents: vi.fn(),
        } as unknown as MessageBus;

        // Create mock context
        mockContext = new AgentContext(mockMessageBus, 'planner');
        plannerAgent = new PlannerAgent(mockContext);
    });

    describe('constructor and properties', () => {
        it('should have correct properties', () => {
            expect(plannerAgent.id).toBe('planner');
            expect(plannerAgent.name).toBe('Planner Agent');
            expect(plannerAgent.capabilities).toEqual([
                {
                    name: 'plan',
                    description: 'Can break down high-level goals into subtasks',
                },
            ]);
        });
    });

    describe('receiveMessage', () => {
        it('should create a plan with research and writing', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'planner',
                to: 'user',
                content: expect.stringContaining('Goal: Create a fitness app'),
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            expect(mockContext.findAgent).toHaveBeenCalledWith('research');
            expect(mockContext.findAgent).toHaveBeenCalledWith('write');
            expect(mockContext.send).toHaveBeenCalledWith(
                'researcher',
                'Research this goal: Create a fitness app',
                expect.objectContaining({
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
            );
            expect(mockContext.send).toHaveBeenCalledWith(
                'writer',
                'Summarize plan for: Create a fitness app',
                expect.objectContaining({
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
            );
        });

        it('should handle missing agents gracefully', async () => {
            // Mock no agents found
            mockContext.findAgent = vi.fn().mockReturnValue(undefined);
            mockContext.send = vi.fn(); // Add this to make it a spy

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness app',
                traceId: 'trace-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'planner',
                to: 'user',
                content: expect.stringContaining('No research agent available'),
                traceId: 'trace-123',
                conversationId: 'mock-uuid-12345',
            });

            expect(mockContext.findAgent).toHaveBeenCalledWith('research');
            expect(mockContext.findAgent).toHaveBeenCalledWith('write');
            expect(mockContext.send).not.toHaveBeenCalled();
        });

        it('should handle partial agent availability', async () => {
            // Mock only some agents found
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce(undefined);

            // Mock successful response for available agent
            mockContext.send = vi.fn().mockResolvedValueOnce({
                from: 'researcher',
                to: 'planner',
                content: 'Research findings',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'planner',
                to: 'user',
                content: expect.stringContaining('Goal: Create a fitness app'),
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            expect(mockContext.send).toHaveBeenCalledWith(
                'researcher',
                'Research this goal: Create a fitness app',
                expect.any(Object)
            );
            expect(mockContext.send).toHaveBeenCalledTimes(1);
        });

        it('should use provided traceId and conversationId', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'custom-trace',
                    conversationId: 'custom-conv',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'custom-trace',
                    conversationId: 'custom-conv',
                });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness tracking app',
                traceId: 'custom-trace',
                conversationId: 'custom-conv',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response.traceId).toBe('custom-trace');
            expect(response.conversationId).toBe('custom-conv');
        });

        it('should generate traceId and conversationId when not provided', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'mock-uuid-12345',
                    conversationId: 'mock-uuid-12345',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'mock-uuid-12345',
                    conversationId: 'mock-uuid-12345',
                });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness tracking app',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response.traceId).toBe('mock-uuid-12345');
            expect(response.conversationId).toBe('mock-uuid-12345');
        });

        it('should log memory information', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory with some entries
            const mockMemory = [
                {
                    direction: 'sent',
                    peer: 'researcher',
                    content: 'test',
                    conversationId: 'conv-123',
                    timestamp: Date.now(),
                },
            ];
            mockContext.getMemory = vi.fn().mockReturnValue(mockMemory);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            await plannerAgent.receiveMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[MEMORY] [trace-123] Planner has seen 1 events so far.'
            );
        });

        it('should handle context send errors', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock send error
            mockContext.send = vi.fn().mockRejectedValue(new Error('Send failed'));

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response.content).toContain(
                'Research:\nError: Research failed - Send failed'
            );
            expect(response.content).toContain(
                'Written Summary:\nError: Writing failed - Send failed'
            );
        });

        it('should handle mixed success and failure responses', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock one success, one failure
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockRejectedValueOnce(new Error('Writer failed'));

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(response.content).toContain('Research:\nResearch findings');
            expect(response.content).toContain(
                'Written Summary:\nError: Writing failed - Writer failed'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty goal', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: '',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'researcher',
                'Research this goal: ',
                expect.any(Object)
            );
            expect(mockContext.send).toHaveBeenCalledWith(
                'writer',
                'Summarize plan for: ',
                expect.any(Object)
            );
            expect(response.content).toContain('Goal: ');
        });

        it('should handle very long goal', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                });

            const longGoal = 'A'.repeat(1000);
            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: longGoal,
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'researcher',
                `Research this goal: ${longGoal}`,
                expect.any(Object)
            );
            expect(mockContext.send).toHaveBeenCalledWith(
                'writer',
                `Summarize plan for: ${longGoal}`,
                expect.any(Object)
            );
            expect(response.content).toContain(`Goal: ${longGoal}`);
        });

        it('should handle special characters in goal', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory
            mockContext.getMemory = vi.fn().mockReturnValue([]);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                });

            const specialGoal = 'App with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: specialGoal,
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await plannerAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'researcher',
                `Research this goal: ${specialGoal}`,
                expect.any(Object)
            );
            expect(mockContext.send).toHaveBeenCalledWith(
                'writer',
                `Summarize plan for: ${specialGoal}`,
                expect.any(Object)
            );
            expect(response.content).toContain(`Goal: ${specialGoal}`);
        });

        it('should handle memory with many entries', async () => {
            // Mock agent discovery
            mockContext.findAgent = vi
                .fn()
                .mockReturnValueOnce('researcher')
                .mockReturnValueOnce('writer');

            // Mock memory with many entries
            const mockMemory = Array.from({ length: 100 }, (_, i) => ({
                direction: 'sent',
                peer: `agent-${i}`,
                content: `message-${i}`,
                conversationId: 'conv-123',
                timestamp: Date.now(),
            }));
            mockContext.getMemory = vi.fn().mockReturnValue(mockMemory);

            // Mock successful responses
            mockContext.send = vi
                .fn()
                .mockResolvedValueOnce({
                    from: 'researcher',
                    to: 'planner',
                    content: 'Research findings',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                })
                .mockResolvedValueOnce({
                    from: 'writer',
                    to: 'planner',
                    content: 'Written summary',
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                });

            const message: AgentMessage = {
                from: 'user',
                to: 'planner',
                content: 'Create a fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            await plannerAgent.receiveMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[MEMORY] [trace-123] Planner has seen 100 events so far.'
            );
        });
    });
});
