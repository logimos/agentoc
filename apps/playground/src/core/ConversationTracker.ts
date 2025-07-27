import { AgentResponse } from './AgentProtocol';

type OnComplete = (responses: AgentResponse[]) => void;

export class ConversationTracker {
  private conversations = new Map<
    string,
    {
      waitingFor: Set<string>;
      responses: AgentResponse[];
      onComplete: OnComplete;
    }
  >();

  start(conversationId: string, waitFor: string[], onComplete: OnComplete) {
    this.conversations.set(conversationId, {
      waitingFor: new Set(waitFor),
      responses: [],
      onComplete,
    });
  }

  receive(conversationId: string, response: AgentResponse) {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;

    conv.responses.push(response);
    conv.waitingFor.delete(response.from);

    if (conv.waitingFor.size === 0) {
      this.conversations.delete(conversationId);
      conv.onComplete(conv.responses);
    }
  }
}
