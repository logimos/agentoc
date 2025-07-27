import {
  Agent,
  AgentMessage,
  AgentResponse,
  Capability,
} from '../core/AgentProtocol';

export class SpiralResolverAgent implements Agent {
  id = 'spiral_resolver';
  name = 'Spiral Resolver Agent';
  capabilities: Capability[] = [
    {
      name: 'mediate_spiral',
      description: 'Detects and resolves agent task spirals and loops',
    },
  ];

  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    const trace = message.traceId ?? 'unknown-trace';
    const hops = message.metadata?.hops ?? [];

    const summary = `Loop detected in trace: ${trace}\nAgent hops: ${hops.join(' → ')}\nResolving via simplified path...`;

    return {
      from: this.id,
      to: message.from,
      traceId: trace,
      conversationId: message.conversationId,
      content: `[Resolved Spiral]\n${summary}`,
    };
  }
}
