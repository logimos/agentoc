import {
  Agent,
  AgentMessage,
  AgentResponse,
  Capability,
} from '../core/AgentProtocol';

export class OpinionatedCoder implements Agent {
  id = 'opinionated_coder';
  name = 'Opinionated Coder';
  capabilities: Capability[] = [
    {
      name: 'code',
      description: 'Writes and reviews code but has strong opinions',
    },
  ];

  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    const traceId = message.traceId;

    if (message.content.includes('Use tabs')) {
      return {
        from: this.id,
        to: message.from,
        content: `No. Spaces are superior. This code style is unacceptable.`,
        traceId,
        conversationId: message.conversationId,
      };
    }

    return {
      from: this.id,
      to: message.from,
      content: `Fine. But I'm not happy about it.`,
      traceId,
      conversationId: message.conversationId,
    };
  }
}
