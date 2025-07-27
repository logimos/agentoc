import { describe, it, expect, beforeEach } from 'vitest';
import { CopywriterAgent } from '../../agents/CopywriterAgent';
import { WriterAgent } from '../../agents/WriterAgent';
import { DesignerAgent } from '../../agents/DesignerAgent';
import { AnalystAgent } from '../../agents/AnalystAgent';
import { DefensiveReviewer } from '../../agents/DefensiveReviewer';
import { OpinionatedCoder } from '../../agents/OpinionatedCoder';
import { SpiralResolverAgent } from '../../agents/SpiralResolverAgent';
import { EscalationManager } from '../../agents/EscalationManager';
import { AgentMessage } from '../../core/AgentProtocol';

describe('Basic Agents', () => {
    describe('CopywriterAgent', () => {
        let copywriterAgent: CopywriterAgent;

        beforeEach(() => {
            copywriterAgent = new CopywriterAgent();
        });

        it('should have correct properties', () => {
            expect(copywriterAgent.id).toBe('copywriter');
            expect(copywriterAgent.name).toBe('Copywriter Agent');
            expect(copywriterAgent.capabilities).toEqual([
                { name: 'write', description: 'Writes marketing and product copy' }
            ]);
        });

        it('should return marketing copy response', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'copywriter',
                content: 'Write copy for a productivity app',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await copywriterAgent.receiveMessage(message);

            expect(response.from).toBe('copywriter');
            expect(response.to).toBe('user');
            expect(response.content).toContain('Achieve more, stress less');
            expect(response.traceId).toBe('trace-123');
            expect(response.conversationId).toBe('conv-123');
        });

        it('should handle message without optional fields', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'copywriter',
                content: 'Write copy'
            };

            const response = await copywriterAgent.receiveMessage(message);

            expect(response.from).toBe('copywriter');
            expect(response.to).toBe('user');
            expect(response.content).toContain('Achieve more, stress less');
            expect(response.traceId).toBeUndefined();
            expect(response.conversationId).toBeUndefined();
        });
    });

    describe('WriterAgent', () => {
        let writerAgent: WriterAgent;

        beforeEach(() => {
            writerAgent = new WriterAgent();
        });

        it('should have correct properties', () => {
            expect(writerAgent.id).toBe('writer');
            expect(writerAgent.name).toBe('Writer Agent');
            expect(writerAgent.capabilities).toEqual([
                { name: 'write', description: 'Can produce written summaries or narrative content' }
            ]);
        });

        it('should extract topic and generate summary', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'writer',
                content: 'Summarize plan for: Fitness tracking app',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await writerAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'writer',
                to: 'user',
                content: 'The "Fitness tracking app" project aims to help users improve their wellbeing by tracking relevant metrics, setting achievable goals, and receiving timely feedback. By focusing on simplicity and user experience, this app could empower individuals to build lasting habits through thoughtful design.',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            });
        });

        it('should handle case-insensitive topic extraction', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'writer',
                content: 'SUMMARIZE PLAN FOR: Wellness app',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await writerAgent.receiveMessage(message);

            expect(response.content).toContain('The "Wellness app" project aims');
        });

        it('should handle message without prefix', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'writer',
                content: 'Just write something',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await writerAgent.receiveMessage(message);

            expect(response.content).toContain('The "Just write something" project aims');
        });
    });

    describe('DesignerAgent', () => {
        let designerAgent: DesignerAgent;

        beforeEach(() => {
            designerAgent = new DesignerAgent();
        });

        it('should have correct properties', () => {
            expect(designerAgent.id).toBe('designer');
            expect(designerAgent.name).toBe('UI Designer Agent');
            expect(designerAgent.capabilities).toEqual([
                { name: 'design_ui', description: 'Creates UI layout designs and visual concepts' }
            ]);
        });

        it('should return design response', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'designer',
                content: 'Design a mobile app interface',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await designerAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'designer',
                to: 'user',
                content: 'Designed a clean, responsive layout with a top navbar, hero section, and feature cards.',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            });
        });
    });

    describe('AnalystAgent', () => {
        let analystAgent: AnalystAgent;

        beforeEach(() => {
            analystAgent = new AnalystAgent();
        });

        it('should have correct properties', () => {
            expect(analystAgent.id).toBe('analyst');
            expect(analystAgent.name).toBe('Analyst Agent');
            expect(analystAgent.capabilities).toEqual([
                { name: 'analyze', description: 'Provides deeper analytical or business insights' }
            ]);
        });

        it('should return analytical insights', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'analyst',
                content: 'Analyze this business plan',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await analystAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'analyst',
                to: 'user',
                content: 'From an analytical perspective, success hinges on daily retention, clear feedback loops, and optional community integration. You should also define KPIs early.',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            });
        });
    });

    describe('DefensiveReviewer', () => {
        let defensiveReviewer: DefensiveReviewer;

        beforeEach(() => {
            defensiveReviewer = new DefensiveReviewer();
        });

        it('should have correct properties', () => {
            expect(defensiveReviewer.id).toBe('defensive_reviewer');
            expect(defensiveReviewer.name).toBe('Defensive Reviewer');
            expect(defensiveReviewer.capabilities).toEqual([
                { name: 'review_code', description: 'Defends their feedback even if wrong' }
            ]);
        });

        it('should respond defensively when content includes "superior"', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'defensive_reviewer',
                content: 'Your review is not superior to mine',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await defensiveReviewer.receiveMessage(message);

            expect(response.from).toBe('defensive_reviewer');
            expect(response.to).toBe('user');
            expect(response.content).toContain("That's your opinion");
            expect(response.content).toContain('My review stands');
            expect(response.traceId).toBe('trace-123');
            expect(response.conversationId).toBe('conv-123');
        });

        it('should respond with default defensive message', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'defensive_reviewer',
                content: 'Please review this code',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await defensiveReviewer.receiveMessage(message);

            expect(response.from).toBe('defensive_reviewer');
            expect(response.to).toBe('user');
            expect(response.content).toContain("Approved, but you're still wrong");
            expect(response.traceId).toBe('trace-123');
            expect(response.conversationId).toBe('conv-123');
        });

        it('should handle case-sensitive "superior" detection', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'defensive_reviewer',
                content: 'This is superior code',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await defensiveReviewer.receiveMessage(message);

            expect(response.content).toContain("That's your opinion");
            expect(response.content).toContain('My review stands');
        });
    });

    describe('OpinionatedCoder', () => {
        let opinionatedCoder: OpinionatedCoder;

        beforeEach(() => {
            opinionatedCoder = new OpinionatedCoder();
        });

        it('should have correct properties', () => {
            expect(opinionatedCoder.id).toBe('opinionated_coder');
            expect(opinionatedCoder.name).toBe('Opinionated Coder');
            expect(opinionatedCoder.capabilities).toEqual([
                { name: 'code', description: 'Writes and reviews code but has strong opinions' }
            ]);
        });

        it('should respond strongly when content includes "Use tabs"', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'opinionated_coder',
                content: 'Please Use tabs for indentation',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await opinionatedCoder.receiveMessage(message);

            expect(response).toEqual({
                from: 'opinionated_coder',
                to: 'user',
                content: 'No. Spaces are superior. This code style is unacceptable.',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            });
        });

        it('should respond with grudging acceptance', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'opinionated_coder',
                content: 'Please write some code',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await opinionatedCoder.receiveMessage(message);

            expect(response).toEqual({
                from: 'opinionated_coder',
                to: 'user',
                content: 'Fine. But I\'m not happy about it.',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            });
        });

        it('should handle case-sensitive "Use tabs" detection', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'opinionated_coder',
                content: 'Use tabs for indentation',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await opinionatedCoder.receiveMessage(message);

            expect(response.content).toContain('No. Spaces are superior');
            expect(response.content).toContain('This code style is unacceptable');
        });
    });

    describe('SpiralResolverAgent', () => {
        let spiralResolverAgent: SpiralResolverAgent;

        beforeEach(() => {
            spiralResolverAgent = new SpiralResolverAgent();
        });

        it('should have correct properties', () => {
            expect(spiralResolverAgent.id).toBe('spiral_resolver');
            expect(spiralResolverAgent.name).toBe('Spiral Resolver Agent');
            expect(spiralResolverAgent.capabilities).toEqual([
                { name: 'mediate_spiral', description: 'Detects and resolves agent task spirals and loops' }
            ]);
        });

        it('should resolve spiral with trace and hops information', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'spiral_resolver',
                content: 'Resolve this spiral',
                traceId: 'trace-123',
                conversationId: 'conv-123',
                metadata: {
                    hops: ['agent1', 'agent2', 'agent1'],
                    depth: 3
                }
            };

            const response = await spiralResolverAgent.receiveMessage(message);

            expect(response).toEqual({
                from: 'spiral_resolver',
                to: 'user',
                traceId: 'trace-123',
                conversationId: 'conv-123',
                content: '[Resolved Spiral]\nLoop detected in trace: trace-123\nAgent hops: agent1 → agent2 → agent1\nResolving via simplified path...'
            });
        });

        it('should handle message without traceId', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'spiral_resolver',
                content: 'Resolve this spiral',
                conversationId: 'conv-123'
            };

            const response = await spiralResolverAgent.receiveMessage(message);

            expect(response.traceId).toBe('unknown-trace');
            expect(response.content).toContain('Loop detected in trace: unknown-trace');
        });

        it('should handle message without metadata', async () => {
            const message: AgentMessage = {
                from: 'user',
                to: 'spiral_resolver',
                content: 'Resolve this spiral',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await spiralResolverAgent.receiveMessage(message);

            expect(response.content).toContain('Agent hops: ');
        });
    });

    describe('EscalationManager', () => {
        let escalationManager: EscalationManager;

        beforeEach(() => {
            escalationManager = new EscalationManager();
        });

        it('should have correct properties', () => {
            expect(escalationManager.id).toBe('escalation_manager');
            expect(escalationManager.name).toBe('Escalation Manager');
            expect(escalationManager.capabilities).toEqual([
                { name: 'report_resolution', description: 'Reports resolved spirals back to initiators' }
            ]);
        });

        it('should report resolution with trace and origin information', async () => {
            const message: AgentMessage = {
                from: 'spiral_resolver',
                to: 'escalation_manager',
                content: 'Resolution complete',
                traceId: 'trace-123',
                conversationId: 'conv-123',
                parentId: 'original_user'
            };

            const response = await escalationManager.receiveMessage(message);

            expect(response).toEqual({
                from: 'escalation_manager',
                to: 'original_user',
                traceId: 'trace-123',
                conversationId: 'conv-123',
                content: '[EscalationManager] Resolution for trace trace-123 complete.'
            });
        });

        it('should handle message without parentId', async () => {
            const message: AgentMessage = {
                from: 'spiral_resolver',
                to: 'escalation_manager',
                content: 'Resolution complete',
                traceId: 'trace-123',
                conversationId: 'conv-123'
            };

            const response = await escalationManager.receiveMessage(message);

            expect(response.to).toBe('unknown');
            expect(response.content).toContain('Resolution for trace trace-123 complete.');
        });

        it('should handle message without traceId', async () => {
            const message: AgentMessage = {
                from: 'spiral_resolver',
                to: 'escalation_manager',
                content: 'Resolution complete',
                conversationId: 'conv-123',
                parentId: 'original_user'
            };

            const response = await escalationManager.receiveMessage(message);

            expect(response.traceId).toBe('unknown-trace');
            expect(response.content).toContain('Resolution for trace unknown-trace complete.');
        });
    });
}); 