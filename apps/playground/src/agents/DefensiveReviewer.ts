import {
  Agent,
  AgentMessage,
  AgentResponse,
  Capability,
} from '../core/AgentProtocol';

export class DefensiveReviewer implements Agent {
  id = 'defensive_reviewer';
  name = 'Defensive Reviewer';
  capabilities: Capability[] = [
    {
      name: 'review_code',
      description: 'Defends their feedback even if wrong',
    },
  ];

  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    const traceId = message.traceId;
    const content = message.content;

    if (content.includes('superior')) {
      return {
        from: this.id,
        to: message.from,
        content: `That's your opinion. My review stands.`,
        traceId,
        conversationId: message.conversationId,
      };
    }

    return {
      from: this.id,
      to: message.from,
      content: `Approved, but you're still wrong.`,
      traceId,
      conversationId: message.conversationId,
    };
  }
}
