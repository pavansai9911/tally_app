// Tally Assistant — core contracts.
//
// The chat UI depends ONLY on `AssistantEngine`. Today that is implemented by a local
// rule-based engine (fully offline). Swapping in OpenAI (or any LLM) later means writing
// one new class that implements this same interface — the UI never changes.
//
// `AssistantTool` is deliberately shaped like an LLM function/tool definition (name +
// description + typed parameters), so the same tools can be handed to a model for
// function-calling without being rewritten.

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  /** Assistant bubbles animate in character-by-character the first time they appear. */
  animate?: boolean;
}

export interface Suggestion {
  /** Text shown on the chip. */
  label: string;
  /** What gets sent to the engine when tapped (defaults to the label). */
  value?: string;
}

/** Where the assistant can hand the user off to a real screen. */
export interface AssistantNavigation {
  tab: 'Home' | 'Money' | 'Habits' | 'Reports';
  screen?: string;
  params?: Record<string, unknown>;
}

export interface AssistantReply {
  /** One or more bubbles, rendered in order with a natural pause between them. */
  messages: string[];
  suggestions?: Suggestion[];
  /** Set when the reply completed a real action — the UI plays a success animation. */
  success?: boolean;
  /** Optional hand-off to a screen (the UI renders an "Open" affordance). */
  navigate?: AssistantNavigation;
  /** Optional label for the navigate affordance. */
  navigateLabel?: string;
}

/**
 * An executable capability. `parameters` mirrors a JSON-schema-ish shape so this registry
 * can be passed to an LLM as tool definitions later.
 */
export interface AssistantTool {
  name: string;
  description: string;
  parameters: Array<{ name: string; description: string; required?: boolean }>;
  run(args: Record<string, string>): Promise<string>;
}

export interface AssistantEngine {
  /** Opening message + starter chips. */
  greet(): Promise<AssistantReply>;
  /** Handle one user turn. */
  respond(input: string): Promise<AssistantReply>;
  /** Abandon any in-progress guided flow. */
  reset(): void;
}
