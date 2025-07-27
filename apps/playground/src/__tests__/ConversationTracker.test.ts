import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AgentResponse } from '../core/AgentProtocol';
import { ConversationTracker } from '../core/ConversationTracker';

describe('ConversationTracker', () => {
  let conversationTracker: ConversationTracker;
  let mockOnComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    conversationTracker = new ConversationTracker();
    mockOnComplete = vi.fn();
  });

  describe('start', () => {
    it('should start a new conversation with waiting agents', () => {
      const conversationId = 'conv-123';
      const waitFor = ['agent-1', 'agent-2', 'agent-3'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      // Verify conversation was started by trying to receive a response
      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-123',
        conversationId: 'conv-123',
      };

      conversationTracker.receive(conversationId, response);

      // Should not call onComplete yet since we're still waiting for 2 more agents
      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('should start conversation with single agent', () => {
      const conversationId = 'conv-single';
      const waitFor = ['agent-1'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-123',
        conversationId: 'conv-single',
      };

      conversationTracker.receive(conversationId, response);

      // Should call onComplete immediately since only one agent was expected
      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });

    it('should start conversation with empty wait list', () => {
      const conversationId = 'conv-empty';
      const waitFor: string[] = [];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      // Should not call onComplete immediately - it only gets called when waitingFor.size === 0
      // which happens in the receive method, not in start
      expect(mockOnComplete).not.toHaveBeenCalled();

      // If we receive any response, it should complete immediately since waitingFor is empty
      const response: AgentResponse = {
        from: 'any-agent',
        to: 'coordinator',
        content: 'Any response',
        traceId: 'trace-123',
        conversationId: 'conv-empty',
      };

      conversationTracker.receive(conversationId, response);

      // Now onComplete should be called
      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });

    it('should overwrite existing conversation with same ID', () => {
      const conversationId = 'conv-overwrite';
      const waitFor1 = ['agent-1', 'agent-2'];
      const waitFor2 = ['agent-3'];

      // Start first conversation
      conversationTracker.start(conversationId, waitFor1, mockOnComplete);

      // Start second conversation with same ID
      const mockOnComplete2 = vi.fn();
      conversationTracker.start(conversationId, waitFor2, mockOnComplete2);

      // Send response for agent-1 (should not trigger first callback)
      const response1: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-123',
        conversationId: 'conv-overwrite',
      };

      conversationTracker.receive(conversationId, response1);

      // First callback should not be called
      expect(mockOnComplete).not.toHaveBeenCalled();

      // Send response for agent-3 (should trigger second callback)
      const response3: AgentResponse = {
        from: 'agent-3',
        to: 'coordinator',
        content: 'Response from agent 3',
        traceId: 'trace-456',
        conversationId: 'conv-overwrite',
      };

      conversationTracker.receive(conversationId, response3);

      // Second callback should be called with both responses (since responses accumulate)
      expect(mockOnComplete2).toHaveBeenCalledWith([response1, response3]);
    });
  });

  describe('receive', () => {
    it('should collect responses and call onComplete when all agents respond', () => {
      const conversationId = 'conv-multi';
      const waitFor = ['agent-1', 'agent-2', 'agent-3'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response1: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-123',
        conversationId: 'conv-multi',
      };

      const response2: AgentResponse = {
        from: 'agent-2',
        to: 'coordinator',
        content: 'Response from agent 2',
        traceId: 'trace-456',
        conversationId: 'conv-multi',
      };

      const response3: AgentResponse = {
        from: 'agent-3',
        to: 'coordinator',
        content: 'Response from agent 3',
        traceId: 'trace-789',
        conversationId: 'conv-multi',
      };

      // Receive responses in different order
      conversationTracker.receive(conversationId, response2);
      expect(mockOnComplete).not.toHaveBeenCalled();

      conversationTracker.receive(conversationId, response1);
      expect(mockOnComplete).not.toHaveBeenCalled();

      conversationTracker.receive(conversationId, response3);

      // Should call onComplete with all responses in order received
      expect(mockOnComplete).toHaveBeenCalledWith([
        response2,
        response1,
        response3,
      ]);
    });

    it('should ignore responses for non-existent conversations', () => {
      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-123',
        conversationId: 'non-existent',
      };

      // Should not throw error
      expect(() => {
        conversationTracker.receive('non-existent', response);
      }).not.toThrow();

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('should handle duplicate responses from same agent', () => {
      const conversationId = 'conv-duplicate';
      const waitFor = ['agent-1', 'agent-2'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response1: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'First response from agent 1',
        traceId: 'trace-123',
        conversationId: 'conv-duplicate',
      };

      const response2: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Second response from agent 1',
        traceId: 'trace-456',
        conversationId: 'conv-duplicate',
      };

      const response3: AgentResponse = {
        from: 'agent-2',
        to: 'coordinator',
        content: 'Response from agent 2',
        traceId: 'trace-789',
        conversationId: 'conv-duplicate',
      };

      // Receive first response from agent-1
      conversationTracker.receive(conversationId, response1);
      expect(mockOnComplete).not.toHaveBeenCalled();

      // Receive second response from agent-1 (should be ignored for completion)
      conversationTracker.receive(conversationId, response2);
      expect(mockOnComplete).not.toHaveBeenCalled();

      // Receive response from agent-2 (should trigger completion)
      conversationTracker.receive(conversationId, response3);

      // Should call onComplete with all responses (including duplicates)
      expect(mockOnComplete).toHaveBeenCalledWith([
        response1,
        response2,
        response3,
      ]);
    });

    it('should handle responses from unexpected agents', () => {
      const conversationId = 'conv-unexpected';
      const waitFor = ['agent-1'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const unexpectedResponse: AgentResponse = {
        from: 'unexpected-agent',
        to: 'coordinator',
        content: 'Response from unexpected agent',
        traceId: 'trace-123',
        conversationId: 'conv-unexpected',
      };

      const expectedResponse: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from expected agent',
        traceId: 'trace-456',
        conversationId: 'conv-unexpected',
      };

      // Receive unexpected response
      conversationTracker.receive(conversationId, unexpectedResponse);
      expect(mockOnComplete).not.toHaveBeenCalled();

      // Receive expected response
      conversationTracker.receive(conversationId, expectedResponse);

      // Should call onComplete with both responses
      expect(mockOnComplete).toHaveBeenCalledWith([
        unexpectedResponse,
        expectedResponse,
      ]);
    });

    it('should handle responses with all optional fields', () => {
      const conversationId = 'conv-full';
      const waitFor = ['agent-1'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response with all fields',
        traceId: 'trace-123',
        conversationId: 'conv-full',
      };

      conversationTracker.receive(conversationId, response);

      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });

    it('should handle responses with minimal fields', () => {
      const conversationId = 'conv-minimal';
      const waitFor = ['agent-1'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Minimal response',
      };

      conversationTracker.receive(conversationId, response);

      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });
  });

  describe('integration', () => {
    it('should handle multiple concurrent conversations', () => {
      const conv1Id = 'conv-1';
      const conv2Id = 'conv-2';
      const mockOnComplete1 = vi.fn();
      const mockOnComplete2 = vi.fn();

      // Start two conversations
      conversationTracker.start(
        conv1Id,
        ['agent-1', 'agent-2'],
        mockOnComplete1
      );
      conversationTracker.start(conv2Id, ['agent-3'], mockOnComplete2);

      const response1: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-123',
        conversationId: conv1Id,
      };

      const response2: AgentResponse = {
        from: 'agent-2',
        to: 'coordinator',
        content: 'Response from agent 2',
        traceId: 'trace-456',
        conversationId: conv1Id,
      };

      const response3: AgentResponse = {
        from: 'agent-3',
        to: 'coordinator',
        content: 'Response from agent 3',
        traceId: 'trace-789',
        conversationId: conv2Id,
      };

      // Receive responses for both conversations
      conversationTracker.receive(conv1Id, response1);
      conversationTracker.receive(conv2Id, response3);
      conversationTracker.receive(conv1Id, response2);

      // Verify both callbacks were called with correct responses
      expect(mockOnComplete1).toHaveBeenCalledWith([response1, response2]);
      expect(mockOnComplete2).toHaveBeenCalledWith([response3]);
    });

    it('should handle conversation lifecycle correctly', () => {
      const conversationId = 'conv-lifecycle';
      const waitFor = ['agent-1', 'agent-2'];

      // Start conversation
      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response1: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'First response',
        traceId: 'trace-123',
        conversationId: 'conv-lifecycle',
      };

      const response2: AgentResponse = {
        from: 'agent-2',
        to: 'coordinator',
        content: 'Second response',
        traceId: 'trace-456',
        conversationId: 'conv-lifecycle',
      };

      // Receive first response
      conversationTracker.receive(conversationId, response1);
      expect(mockOnComplete).not.toHaveBeenCalled();

      // Receive second response (should complete conversation)
      conversationTracker.receive(conversationId, response2);
      expect(mockOnComplete).toHaveBeenCalledWith([response1, response2]);

      // Try to receive another response (should be ignored)
      const response3: AgentResponse = {
        from: 'agent-3',
        to: 'coordinator',
        content: 'Late response',
        traceId: 'trace-789',
        conversationId: 'conv-lifecycle',
      };

      conversationTracker.receive(conversationId, response3);

      // onComplete should not be called again
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid responses', () => {
      const conversationId = 'conv-rapid';
      const waitFor = ['agent-1', 'agent-2', 'agent-3'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const responses: AgentResponse[] = [
        {
          from: 'agent-1',
          to: 'coordinator',
          content: 'Response 1',
          traceId: 'trace-1',
          conversationId: 'conv-rapid',
        },
        {
          from: 'agent-2',
          to: 'coordinator',
          content: 'Response 2',
          traceId: 'trace-2',
          conversationId: 'conv-rapid',
        },
        {
          from: 'agent-3',
          to: 'coordinator',
          content: 'Response 3',
          traceId: 'trace-3',
          conversationId: 'conv-rapid',
        },
      ];

      // Receive all responses rapidly
      responses.forEach((response) => {
        conversationTracker.receive(conversationId, response);
      });

      // Should call onComplete once with all responses
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(mockOnComplete).toHaveBeenCalledWith(responses);
    });
  });

  describe('edge cases', () => {
    it('should handle empty conversation ID', () => {
      const conversationId = '';
      const waitFor = ['agent-1'];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response',
        traceId: 'trace-123',
        conversationId: '',
      };

      conversationTracker.receive(conversationId, response);

      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });

    it('should handle empty agent names in waitFor', () => {
      const conversationId = 'conv-empty-agents';
      const waitFor = ['', 'agent-1', ''];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response1: AgentResponse = {
        from: '',
        to: 'coordinator',
        content: 'Response from empty agent',
        traceId: 'trace-123',
        conversationId: 'conv-empty-agents',
      };

      const response2: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response from agent 1',
        traceId: 'trace-456',
        conversationId: 'conv-empty-agents',
      };

      conversationTracker.receive(conversationId, response1);
      conversationTracker.receive(conversationId, response2);

      expect(mockOnComplete).toHaveBeenCalledWith([response1, response2]);
    });

    it('should handle very long agent names', () => {
      const conversationId = 'conv-long-names';
      const longAgentName = 'A'.repeat(1000);
      const waitFor = [longAgentName];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response: AgentResponse = {
        from: longAgentName,
        to: 'coordinator',
        content: 'Response from long named agent',
        traceId: 'trace-123',
        conversationId: 'conv-long-names',
      };

      conversationTracker.receive(conversationId, response);

      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });

    it('should handle special characters in agent names', () => {
      const conversationId = 'conv-special-chars';
      const specialAgentName =
        'agent-with-special-chars:!@#$%^&*()_+-=[]{}|;:,.<>?';
      const waitFor = [specialAgentName];

      conversationTracker.start(conversationId, waitFor, mockOnComplete);

      const response: AgentResponse = {
        from: specialAgentName,
        to: 'coordinator',
        content: 'Response from special agent',
        traceId: 'trace-123',
        conversationId: 'conv-special-chars',
      };

      conversationTracker.receive(conversationId, response);

      expect(mockOnComplete).toHaveBeenCalledWith([response]);
    });

    it('should handle onComplete callback that throws error', () => {
      const conversationId = 'conv-error-callback';
      const waitFor = ['agent-1'];
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      conversationTracker.start(conversationId, waitFor, errorCallback);

      const response: AgentResponse = {
        from: 'agent-1',
        to: 'coordinator',
        content: 'Response',
        traceId: 'trace-123',
        conversationId: 'conv-error-callback',
      };

      // Should throw error when callback throws
      expect(() => {
        conversationTracker.receive(conversationId, response);
      }).toThrow('Callback error');

      expect(errorCallback).toHaveBeenCalledWith([response]);
    });
  });
});
