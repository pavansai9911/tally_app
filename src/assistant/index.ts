// Single place the app obtains an assistant from.
//
// THE LLM SWAP POINT: to move to OpenAI (or any model), implement AssistantEngine in e.g.
// `openAiEngine.ts` — pass ASSISTANT_TOOLS as function/tool definitions and execute the
// tool the model picks — then return it from createAssistantEngine(). No UI changes, no
// changes to intents, flows or actions.

import { AssistantEngine } from './types';
import { RuleAssistantEngine } from './ruleEngine';

export function createAssistantEngine(): AssistantEngine {
  return new RuleAssistantEngine();
}

export * from './types';
export { ASSISTANT_TOOLS } from './actions';
export { INTENTS, STARTER_SUGGESTIONS } from './intents';
