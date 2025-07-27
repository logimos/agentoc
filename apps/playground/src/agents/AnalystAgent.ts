import {
  Agent,
  AgentMessage,
  AgentResponse,
  Capability,
} from '../core/AgentProtocol';

export class AnalystAgent implements Agent {
  id = 'analyst';
  name = 'Analyst Agent';
  capabilities: Capability[] = [
    {
      name: 'analyze',
      description: 'Provides deeper analytical or business insights',
    },
  ];

  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    const response = `From an analytical perspective, success hinges on daily retention, clear feedback loops, and optional community integration. You should also define KPIs early.`;

    return {
      from: this.id,
      to: message.from,
      content: response,
      traceId: message.traceId,
      conversationId: message.conversationId,
    };
  }
}
