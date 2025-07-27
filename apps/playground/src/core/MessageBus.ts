import { Agent, AgentMessage, AgentResponse } from './AgentProtocol';

export class MessageBus {
  private agents = new Map<string, Agent>();

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  async send(message: AgentMessage): Promise<AgentResponse> {
    const recipient = this.agents.get(message.to);
    if (!recipient) throw new Error(`Agent ${message.to} not found`);

    console.log(
      `[DISPATCH] [${message.traceId}] ${message.from} → ${message.to}`
    );

    const response = await recipient.receiveMessage(message);
    response.traceId = message.traceId;
    return response;
  }

  getAgentsByCapability(capabilityName: string): Agent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.capabilities.some((c) => c.name === capabilityName)
    );
  }

  getFirstAgentByCapability(capabilityName: string): Agent | undefined {
    return this.getAgentsByCapability(capabilityName)[0];
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}
