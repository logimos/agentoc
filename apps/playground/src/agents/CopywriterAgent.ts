import {
  Agent,
  AgentMessage,
  AgentResponse,
  Capability,
} from '../core/AgentProtocol';

export class CopywriterAgent implements Agent {
  id = 'copywriter';
  name = 'Copywriter Agent';
  capabilities: Capability[] = [
    { name: 'write', description: 'Writes marketing and product copy' },
  ];

  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    return {
      from: this.id,
      to: message.from,
      content: `“Achieve more, stress less. Our productivity app helps you focus on what matters.”`,
      traceId: message.traceId,
      conversationId: message.conversationId,
    };
  }
}
