import { Agent, AgentMessage, AgentResponse, Capability } from '../core/AgentProtocol'

export class DesignerAgent implements Agent {
    id = 'designer'
    name = 'UI Designer Agent'
    capabilities: Capability[] = [
        { name: 'design_ui', description: 'Creates UI layout designs and visual concepts' }
    ]

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        return {
            from: this.id,
            to: message.from,
            content: `Designed a clean, responsive layout with a top navbar, hero section, and feature cards.`,
            traceId: message.traceId,
            conversationId: message.conversationId
        }
    }
}
