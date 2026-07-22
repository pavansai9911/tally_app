// Offline rule-based implementation of AssistantEngine.
//
// Turn handling order:
//   1. global "cancel"
//   2. if a guided flow is active -> fill the next slot
//   3. try a one-shot free-text command ("I spent 500 on food")
//   4. intent match -> tool / flow / static reply
//   5. graceful fallback
//
// To move to an LLM, write another class implementing AssistantEngine that sends the same
// tool registry as function definitions. The UI is untouched.

import { AssistantEngine, AssistantReply, Suggestion } from './types';
import { INTENTS, STARTER_SUGGESTIONS, FALLBACK_SUGGESTIONS } from './intents';
import { FLOWS, FlowDef, getFlow, promptFor } from './flows';
import { getTool } from './actions';
import {
  matchIntent, extractAmount, extractCategoryHint, looksLikeIncome, looksLikeExpense,
  isSkip, normalise,
} from './nlu';

interface ActiveFlow {
  flow: FlowDef;
  stepIndex: number;
  slots: Record<string, string>;
}

export class RuleAssistantEngine implements AssistantEngine {
  private active: ActiveFlow | null = null;

  reset(): void {
    this.active = null;
  }

  async greet(): Promise<AssistantReply> {
    return {
      messages: [
        "Hi! I'm your Tally Assistant 👋",
        'I can add transactions, set budgets and habits, or answer questions about your money. What would you like to do?',
      ],
      suggestions: STARTER_SUGGESTIONS,
    };
  }

  async respond(input: string): Promise<AssistantReply> {
    const text = input.trim();
    if (!text) return { messages: ['Say anything and I\'ll help.'], suggestions: STARTER_SUGGESTIONS };

    // 1. Cancel always wins.
    if (/^(cancel|stop|nevermind|never mind|forget it|abort)$/.test(normalise(text))) {
      const wasActive = !!this.active;
      this.reset();
      return {
        messages: [wasActive ? 'Cancelled — nothing was saved.' : 'Nothing to cancel.'],
        suggestions: STARTER_SUGGESTIONS,
      };
    }

    // 2. Continue an in-progress guided conversation.
    if (this.active) return this.advanceFlow(text);

    // 3. One-shot natural commands, e.g. "I spent 500 on food".
    const oneShot = await this.tryOneShot(text);
    if (oneShot) return oneShot;

    // 4. Intent match.
    const match = matchIntent(text);
    if (match) return this.runIntent(match.intent.id, text);

    // 5. Fallback.
    return {
      messages: [
        "I'm not sure I follow yet.",
        'Try things like "I spent 500 on food", "monthly summary", or "add habit".',
      ],
      suggestions: FALLBACK_SUGGESTIONS,
    };
  }

  /** Run a known intent id (also used by suggestion chips). */
  private async runIntent(id: string, rawInput: string): Promise<AssistantReply> {
    const intent = INTENTS.find((i) => i.id === id);
    if (!intent) return { messages: ["I couldn't handle that."], suggestions: FALLBACK_SUGGESTIONS };

    if (intent.tool) {
      const tool = getTool(intent.tool);
      if (tool) {
        const text = await tool.run({});
        return { messages: [text], suggestions: FALLBACK_SUGGESTIONS };
      }
    }

    if (intent.flow) {
      const flow = getFlow(intent.flow);
      if (flow) return this.startFlow(flow, rawInput);
    }

    return {
      messages: intent.reply ? [intent.reply] : ['Sure.'],
      suggestions: intent.suggestions ?? FALLBACK_SUGGESTIONS,
      navigate: intent.navigate,
      navigateLabel: intent.navigateLabel,
    };
  }

  /**
   * Handle a complete instruction in one sentence. Only fires when there is both a clear
   * money verb and an amount, so ordinary questions still fall through to intents.
   */
  private async tryOneShot(text: string): Promise<AssistantReply | null> {
    const amount = extractAmount(text);
    if (!amount) return null;
    const income = looksLikeIncome(text);
    const expense = looksLikeExpense(text);
    if (!income && !expense) return null;

    const category = extractCategoryHint(text) ?? undefined;
    const tool = getTool(income ? 'add_income' : 'add_expense');
    if (!tool) return null;

    // Without a category we still need one — pre-fill the amount and ask.
    if (!category) {
      const flow = getFlow(income ? 'add_income' : 'add_expense')!;
      this.active = { flow, stepIndex: 0, slots: { amount: String(amount) } };
      return this.askCurrentStep([
        `Got it — ${income ? 'income' : 'expense'} of ${amount}.`,
      ]);
    }

    const result = await tool.run({ amount: String(amount), category });
    return { messages: [result], success: true, suggestions: FALLBACK_SUGGESTIONS };
  }

  private async startFlow(flow: FlowDef, rawInput: string): Promise<AssistantReply> {
    const slots: Record<string, string> = {};

    // Seed slots we can already infer from the opening sentence.
    const amount = extractAmount(rawInput);
    if (amount && flow.steps.some((s) => s.slot === 'amount')) slots.amount = String(amount);
    const category = extractCategoryHint(rawInput);
    if (category && flow.steps.some((s) => s.slot === 'category')) slots.category = category;

    this.active = { flow, stepIndex: 0, slots };
    return this.askCurrentStep(flow.intro ? [flow.intro] : []);
  }

  /** Move to the next unfilled step, or finish the flow. */
  private async askCurrentStep(preamble: string[] = []): Promise<AssistantReply> {
    const state = this.active;
    if (!state) return { messages: ['Something went wrong.'], suggestions: STARTER_SUGGESTIONS };

    while (state.stepIndex < state.flow.steps.length) {
      const step = state.flow.steps[state.stepIndex];
      if (state.slots[step.slot] !== undefined) {
        state.stepIndex++;
        continue;
      }
      const suggestions: Suggestion[] | undefined = step.suggestions ? await step.suggestions() : undefined;
      return {
        messages: [...preamble, promptFor(step, state.slots)],
        suggestions,
      };
    }
    return this.finishFlow(preamble);
  }

  private async advanceFlow(text: string): Promise<AssistantReply> {
    const state = this.active!;
    const step = state.flow.steps[state.stepIndex];

    if (step.optional && isSkip(text)) {
      state.slots[step.slot] = '';
      state.stepIndex++;
      return this.askCurrentStep();
    }

    const value = step.parse ? step.parse(text) : text.trim();
    if (value === null) {
      const suggestions = step.suggestions ? await step.suggestions() : undefined;
      return { messages: [step.invalid ?? "That didn't look right — could you try again?"], suggestions };
    }

    state.slots[step.slot] = value;
    state.stepIndex++;
    return this.askCurrentStep();
  }

  private async finishFlow(preamble: string[] = []): Promise<AssistantReply> {
    const state = this.active!;
    const { flow, slots } = state;
    this.reset();

    // The reminder flow is guidance-only (reminders are configured on the habit itself).
    if (flow.tool === 'noop_reminder') {
      return {
        messages: [
          ...preamble,
          `To set a reminder for "${slots.name}", open the habit and turn on Reminder — you can pick the exact time there.`,
        ],
        navigate: { tab: 'Habits' },
        navigateLabel: 'Open Habits',
        suggestions: FALLBACK_SUGGESTIONS,
      };
    }

    const tool = getTool(flow.tool);
    if (!tool) return { messages: ["I couldn't complete that."], suggestions: FALLBACK_SUGGESTIONS };

    try {
      const result = await tool.run(slots);
      return { messages: [...preamble, result], success: true, suggestions: FALLBACK_SUGGESTIONS };
    } catch {
      return { messages: ['Something went wrong saving that — nothing was changed.'], suggestions: FALLBACK_SUGGESTIONS };
    }
  }
}
