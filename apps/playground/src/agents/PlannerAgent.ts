import { Agent, AgentMessage, AgentResponse, Capability } from '../core/AgentProtocol'
import { AgentContext } from '../core/AgentContext'
import { ConversationTracker } from '../core/ConversationTracker'
import { v4 as uuidv4 } from 'uuid'

export class PlannerAgent implements Agent {
    id = 'planner'
    name = 'Planner Agent'
    capabilities: Capability[] = [
        { name: 'plan', description: 'Can break down high-level goals into subtasks' }
    ]

    private tracker = new ConversationTracker()

    constructor(private context: AgentContext) { }

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        const goal = message.content
        const traceId = message.traceId ?? uuidv4()
        const conversationId = message.conversationId ?? uuidv4()

        const previousMemory = this.context.getMemory(traceId)
        console.log(`[MEMORY] [${traceId}] Planner has seen ${previousMemory.length} events so far.`)

        const researcherId = this.context.findAgent('research')
        const writerId = this.context.findAgent('write')

        const idsToWaitFor = [researcherId, writerId].filter(Boolean) as string[]

        // If no agents are found, return immediately with a message
        if (idsToWaitFor.length === 0) {
            return {
                from: this.id,
                to: message.from,
                traceId,
                conversationId,
                content: `Goal: ${goal}\n\nResearch:\nNo research agent available.\n\nWritten Summary:\nNo writer agent available.`
            }
        }

        return new Promise(resolve => {
            this.tracker.start(conversationId, idsToWaitFor, (responses) => {
                // Handle partial responses - responses array may have undefined values
                const research = responses[0] || { content: 'No research response received.' }
                const write = responses[1] || { content: 'No writer response received.' }

                resolve({
                    from: this.id,
                    to: message.from,
                    traceId,
                    conversationId,
                    content: `Goal: ${goal}\n\nResearch:\n${research.content}\n\nWritten Summary:\n${write.content}`
                })
            })

            if (researcherId) {
                this.context.send(researcherId, `Research this goal: ${goal}`, { traceId, conversationId, parentId: message.from })
                    .then(res => this.tracker.receive(conversationId, res))
                    .catch(error => {
                        // If research fails, send an error response to the tracker
                        this.tracker.receive(conversationId, {
                            from: researcherId,
                            to: this.id,
                            content: `Error: Research failed - ${error.message}`,
                            traceId,
                            conversationId
                        })
                    })
            }

            if (writerId) {
                this.context.send(writerId, `Summarize plan for: ${goal}`, { traceId, conversationId, parentId: message.from })
                    .then(res => this.tracker.receive(conversationId, res))
                    .catch(error => {
                        // If writer fails, send an error response to the tracker
                        this.tracker.receive(conversationId, {
                            from: writerId,
                            to: this.id,
                            content: `Error: Writing failed - ${error.message}`,
                            traceId,
                            conversationId
                        })
                    })
            }
        })
    }
}
