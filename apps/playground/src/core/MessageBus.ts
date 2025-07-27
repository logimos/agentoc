import { Agent, AgentMessage, AgentResponse } from './AgentProtocol'

export class MessageBus {
    private agents: Map<string, Agent> = new Map()

    register(agent: Agent): void {
        this.agents.set(agent.id, agent)
    }

    async send(message: AgentMessage): Promise<AgentResponse> {
        const recipient = this.agents.get(message.to)
        if (!recipient) throw new Error(`Agent ${message.to} not found`)
        return recipient.receiveMessage(message)
    }

    listAgents(): string[] {
        return Array.from(this.agents.keys())
    }
}
