import { Agent, AgentMessage, AgentResponse, Capability } from '../core/AgentProtocol'

export class WriterAgent implements Agent {
    id = 'writer'
    name = 'Writer Agent'
    capabilities: Capability[] = [
        { name: 'write', description: 'Can produce written summaries or narrative content' }
    ]

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        const topic = message.content.replace(/^Summarize plan for:\s*/i, '')

        const response = `The \"${topic}\" project aims to help users improve their wellbeing by tracking relevant metrics, setting achievable goals, and receiving timely feedback. By focusing on simplicity and user experience, this app could empower individuals to build lasting habits through thoughtful design.`

        return {
            from: this.id,
            to: message.from,
            content: response,
            traceId: message.traceId,
            conversationId: message.conversationId
        }
    }
}
