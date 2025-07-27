import { Agent, AgentMessage, AgentResponse, Capability } from '../core/AgentProtocol'
import { AgentContext } from '../core/AgentContext'
import { ConversationTracker } from '../core/ConversationTracker'
import { v4 as uuidv4 } from 'uuid'

export class OrchestratorAgent implements Agent {
    id = 'orchestrator'
    name = 'Orchestrator Agent'
    capabilities: Capability[] = [
        { name: 'orchestrate', description: 'Coordinates tasks between agents and assembles results' }
    ]

    private context: AgentContext
    private tracker = new ConversationTracker()

    constructor(bus: any) {
        this.context = new AgentContext(bus, this.id)
    }

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        const traceId = message.traceId ?? uuidv4()
        const conversationId = message.conversationId ?? uuidv4()
        const goal = message.content

        const subTasks = [
            { capability: 'design_ui', content: `Design layout for: ${goal}` },
            { capability: 'write', content: `Write intro copy for: ${goal}` },
            { capability: 'code', content: `Implement UI in HTML for: ${goal}` }
        ]

        const assignees = subTasks.map(task => {
            const agentId = this.context.findAgent(task.capability)
            return agentId ? { agentId, ...task } : null
        }).filter(Boolean) as { agentId: string, capability: string, content: string }[]

        const idsToWaitFor = assignees.map(t => t.agentId)

        // If no agents are found, return immediately with a message
        if (idsToWaitFor.length === 0) {
            return {
                from: this.id,
                to: message.from,
                content: `No agents available to orchestrate tasks for: ${goal}`,
                traceId,
                conversationId
            }
        }

        return new Promise(resolve => {
            this.tracker.start(conversationId, idsToWaitFor, (responses) => {
                const summary = responses.map(r => `From ${r.from}:
${r.content}`).join('\n\n')
                resolve({
                    from: this.id,
                    to: message.from,
                    content: `Here is your assembled result for: ${goal}\n\n${summary}`,
                    traceId,
                    conversationId
                })
            })

            assignees.forEach(({ agentId, content }) => {
                const sendWithRetry = async () => {
                    try {
                        const res = await this.context.send(agentId, content, {
                            traceId,
                            conversationId,
                            parentId: message.from,
                            metadata: message.metadata
                        })
                        this.tracker.receive(conversationId, res)
                    } catch (err) {
                        console.warn(`[WARN] [${traceId}] ${agentId} failed, retrying once...`)
                        try {
                            const retry = await this.context.send(agentId, content, {
                                traceId,
                                conversationId,
                                parentId: message.from,
                                metadata: message.metadata
                            })
                            this.tracker.receive(conversationId, retry)
                        } catch (finalErr) {
                            this.tracker.receive(conversationId, {
                                from: agentId,
                                to: this.id,
                                content: `[FALLBACK] ${agentId} failed after retry.`,
                                traceId,
                                conversationId
                            })
                        }
                    }
                }

                sendWithRetry()
            })
        })
    }
}
