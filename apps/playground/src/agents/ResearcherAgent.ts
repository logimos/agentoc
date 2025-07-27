import { v4 as uuidv4 } from 'uuid';

import { AgentContext } from '../core/AgentContext';
import {
    Agent,
    AgentMessage,
    AgentResponse,
    Capability,
} from '../core/AgentProtocol';
import { ConversationTracker } from '../core/ConversationTracker';


export class ResearcherAgent implements Agent {
    id = 'researcher';
    name = 'Researcher Agent';
    capabilities: Capability[] = [
        {
            name: 'research',
            description: 'Can find information related to a topic or goal',
        },
    ];

    private tracker = new ConversationTracker();
    private context?: AgentContext;

    setContext(ctx: AgentContext) {
        this.context = ctx;
    }

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        if (!this.context) throw new Error('No context set for researcher');

        const topic = message.content.replace(/^Research this goal:\s*/i, '');
        const conversationId = message.conversationId ?? uuidv4();
        const traceId = message.traceId ?? uuidv4();

        const analystId = this.context.findAgent('analyze');
        if (!analystId) {
            return {
                from: this.id,
                to: message.from,
                content: `General info for "${topic}" but no analyst available.`,
                traceId,
                conversationId,
            };
        }

        return new Promise((resolve) => {
            this.tracker.start(conversationId, [analystId], ([analystResponse]) => {
                const summary = `Here are some key points about "${topic}":
- Common features: user tracking, progress charts, reminders
- Competitors: FitTrack, MyFitnessPal, Google Fit
- Trends: Wearable integration, gamification, habit loops

Analyst insight:\n${analystResponse.content}`;

                resolve({
                    from: this.id,
                    to: message.from,
                    content: summary,
                    traceId,
                    conversationId,
                });
            });

            this.context!.send(analystId, `Provide analysis for: ${topic}`, {
                traceId,
                conversationId,
                parentId: message.from,
            })
                .then((res) => this.tracker.receive(conversationId, res))
                .catch((error) => {
                    // If context.send fails, we need to resolve the promise with an error response
                    // This prevents the promise from hanging indefinitely
                    resolve({
                        from: this.id,
                        to: message.from,
                        content: `Error: Failed to get analysis for "${topic}". ${error.message}`,
                        traceId,
                        conversationId,
                    });
                });
        });
    }
}
