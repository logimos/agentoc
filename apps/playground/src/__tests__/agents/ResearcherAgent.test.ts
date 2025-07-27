import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ResearcherAgent } from '../../agents/ResearcherAgent';
import { AgentContext } from '../../core/AgentContext';
import { AgentMessage } from '../../core/AgentProtocol';
import { MessageBus } from '../../core/MessageBus';

// Mock console.log to avoid cluttering test output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

// Mock uuid to return predictable values
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-12345'),
}));

describe('ResearcherAgent', () => {
    let researcherAgent: ResearcherAgent;
    let mockContext: AgentContext;
    let mockMessageBus: MessageBus;

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
        mockContext = new AgentContext(mockMessageBus, 'researcher');
        researcherAgent = new ResearcherAgent();
        researcherAgent.setContext(mockContext);
    });

    describe('constructor and properties', () => {
        it('should have correct properties', () => {
            expect(researcherAgent.id).toBe('researcher');
            expect(researcherAgent.name).toBe('Researcher Agent');
            expect(researcherAgent.capabilities).toEqual([
                {
                    name: 'research',
                    description: 'Can find information related to a topic or goal',
                },
            ]);
        });
    });

    describe('setContext', () => {
        it('should set the context', () => {
            const newContext = {
                send: vi.fn(),
                findAgent: vi.fn(),
                findAgents: vi.fn(),
                getMemory: vi.fn(),
            } as unknown as AgentContext;

            researcherAgent.setContext(newContext);

            // Verify context was set by checking if receiveMessage doesn't throw
            expect(() => {
                researcherAgent.receiveMessage({
                    from: 'user',
                    to: 'researcher',
                    content: 'Research this goal: test',
                });
            }).not.toThrow();
        });
    });

    describe('receiveMessage', () => {
        it('should extract topic and find analyst', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights about fitness apps',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.findAgent).toHaveBeenCalledWith('analyze');
            expect(mockContext.send).toHaveBeenCalledWith(
                'analyst',
                'Provide analysis for: fitness tracking app',
                {
                    traceId: 'trace-123',
                    conversationId: 'conv-123',
                    parentId: 'user',
                }
            );

            expect(response).toEqual({
                from: 'researcher',
                to: 'user',
                content: expect.stringContaining(
                    'Here are some key points about "fitness tracking app"'
                ),
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            expect(response.content).toContain(
                'Analyst insight:\nAnalytical insights about fitness apps'
            );
        });

        it('should handle case-insensitive topic extraction', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'RESEARCH THIS GOAL: wellness app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'analyst',
                'Provide analysis for: wellness app',
                expect.any(Object)
            );
            expect(response.content).toContain(
                'Here are some key points about "wellness app"'
            );
        });

        it('should handle message without prefix', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Just research this topic',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'analyst',
                'Provide analysis for: Just research this topic',
                expect.any(Object)
            );
            expect(response.content).toContain(
                'Here are some key points about "Just research this topic"'
            );
        });

        it('should handle missing analyst gracefully', async () => {
            // Mock no analyst found
            mockContext.findAgent = vi.fn().mockReturnValue(undefined);
            mockContext.send = vi.fn(); // Add this to make it a spy

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.findAgent).toHaveBeenCalledWith('analyze');
            expect(mockContext.send).not.toHaveBeenCalled();

            expect(response).toEqual({
                from: 'researcher',
                to: 'user',
                content:
                    'General info for "fitness tracking app" but no analyst available.',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });
        });

        it('should use provided traceId and conversationId', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'custom-trace',
                conversationId: 'custom-conv',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
                traceId: 'custom-trace',
                conversationId: 'custom-conv',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(response.traceId).toBe('custom-trace');
            expect(response.conversationId).toBe('custom-conv');
        });

        it('should generate traceId and conversationId when not provided', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'mock-uuid-12345',
                conversationId: 'mock-uuid-12345',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(response.traceId).toBe('mock-uuid-12345');
            expect(response.conversationId).toBe('mock-uuid-12345');
        });

        it('should throw error when context is not set', async () => {
            const agentWithoutContext = new ResearcherAgent();

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            await expect(agentWithoutContext.receiveMessage(message)).rejects.toThrow(
                'No context set for researcher'
            );
        });

        it('should include predefined research summary', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights about fitness apps',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(response.content).toContain(
                'Common features: user tracking, progress charts, reminders'
            );
            expect(response.content).toContain(
                'Competitors: FitTrack, MyFitnessPal, Google Fit'
            );
            expect(response.content).toContain(
                'Trends: Wearable integration, gamification, habit loops'
            );
        });

        it('should handle context send errors', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock send error
            mockContext.send = vi.fn().mockRejectedValue(new Error('Send failed'));

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'researcher',
                to: 'user',
                content:
                    'Error: Failed to get analysis for "fitness tracking app". Send failed',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });
        });
    });

    describe('edge cases', () => {
        it('should handle empty topic', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: 'Research this goal: ',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'analyst',
                'Provide analysis for: ',
                expect.any(Object)
            );
            expect(response.content).toContain('Here are some key points about ""');
        });

        it('should handle very long topic', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const longTopic = 'A'.repeat(1000);
            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: `Research this goal: ${longTopic}`,
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'analyst',
                `Provide analysis for: ${longTopic}`,
                expect.any(Object)
            );
            expect(response.content).toContain(
                `Here are some key points about "${longTopic}"`
            );
        });

        it('should handle special characters in topic', async () => {
            // Mock analyst found
            mockContext.findAgent = vi.fn().mockReturnValue('analyst');

            // Mock successful response
            mockContext.send = vi.fn().mockResolvedValue({
                from: 'analyst',
                to: 'researcher',
                content: 'Analytical insights',
                traceId: 'trace-123',
                conversationId: 'conv-123',
            });

            const specialTopic = 'App with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
            const message: AgentMessage = {
                from: 'user',
                to: 'researcher',
                content: `Research this goal: ${specialTopic}`,
                traceId: 'trace-123',
                conversationId: 'conv-123',
            };

            const response = await researcherAgent.receiveMessage(message);

            expect(mockContext.send).toHaveBeenCalledWith(
                'analyst',
                `Provide analysis for: ${specialTopic}`,
                expect.any(Object)
            );
            expect(response.content).toContain(
                `Here are some key points about "${specialTopic}"`
            );
        });
    });
});
