import { Agent, AgentMessage, AgentResponse, Capability } from '../core/AgentProtocol'

export class EscalationManager implements Agent {
    id = 'escalation_manager'
    name = 'Escalation Manager'
    capabilities: Capability[] = [
        { name: 'report_resolution', description: 'Reports resolved spirals back to initiators' }
    ]

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        const trace = message.traceId ?? 'unknown-trace'
        const origin = message.parentId ?? 'unknown'

        return {
            from: this.id,
            to: origin,
            traceId: trace,
            conversationId: message.conversationId,
            content: `[EscalationManager] Resolution for trace ${trace} complete.`
        }
    }
}
