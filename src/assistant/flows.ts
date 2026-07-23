// Guided conversations (slot filling).
//
// A flow is a list of steps; each step asks for one slot and parses the answer. When every
// slot is filled the flow runs a tool from actions.ts. Prompts and chips are data, so a new
// guided conversation is just another entry in FLOWS.

import { Suggestion } from './types';
import { listAccounts, listCategories, listHabits } from '@/db';
import { extractAmount, isSkip } from './nlu';

export interface FlowStep {
  slot: string;
  /** Question to ask. */
  prompt: string | ((slots: Record<string, string>) => string);
  /** Dynamic chips (e.g. the user's real categories). */
  suggestions?: () => Promise<Suggestion[]>;
  /** Parse the user's answer into a slot value; return null to re-ask. */
  parse?: (input: string) => string | null;
  /** Message shown when parse fails. */
  invalid?: string;
  optional?: boolean;
}

export interface FlowDef {
  id: string;
  /** Tool to run once all slots are collected. */
  tool: string;
  intro?: string;
  steps: FlowStep[];
  /**
   * Slots resolved before the conversation starts. Used to skip questions that have only
   * one sensible answer (e.g. don't ask "which account?" when there is only one).
   */
  prefill?: () => Promise<Record<string, string>>;
}

const amountParser = (input: string): string | null => {
  const v = extractAmount(input);
  return v && v > 0 ? String(v) : null;
};

async function categoryChips(type: 'expense' | 'income'): Promise<Suggestion[]> {
  const cats = await listCategories(type);
  const names = cats.slice(0, 12).map((c) => ({ label: c.name }));
  return names.length > 0 ? names : [{ label: 'Other' }];
}

async function accountChips(): Promise<Suggestion[]> {
  const accounts = await listAccounts();
  return accounts.slice(0, 5).map((a) => ({ label: a.name }));
}

/** Only ask which account when the user actually has a choice. */
async function singleAccountPrefill(slot: string): Promise<Record<string, string>> {
  const accounts = await listAccounts();
  return accounts.length === 1 ? { [slot]: accounts[0].name } : {};
}

async function habitChips(): Promise<Suggestion[]> {
  const habits = await listHabits();
  return habits.slice(0, 8).map((h) => ({ label: h.name }));
}

export const FLOWS: FlowDef[] = [
  {
    id: 'add_expense',
    tool: 'add_expense',
    prefill: () => singleAccountPrefill('account'),
    steps: [
      { slot: 'category', prompt: 'Which category?', suggestions: () => categoryChips('expense') },
      { slot: 'amount', prompt: (s) => `How much did you spend on ${s.category}?`, parse: amountParser, invalid: "I didn't catch a number there — how much was it?" },
      { slot: 'account', prompt: 'Which account should this be deducted from?', suggestions: accountChips },
      { slot: 'note', prompt: 'Any note? (or tap Skip)', suggestions: async () => [{ label: 'Skip' }], optional: true },
    ],
  },
  {
    id: 'add_income',
    tool: 'add_income',
    prefill: () => singleAccountPrefill('account'),
    steps: [
      { slot: 'category', prompt: 'What kind of income?', suggestions: () => categoryChips('income') },
      { slot: 'amount', prompt: 'How much did you receive?', parse: amountParser, invalid: "I didn't catch a number — how much was it?" },
      { slot: 'account', prompt: 'Which account should this be added to?', suggestions: accountChips },
      { slot: 'note', prompt: 'Any note? (or tap Skip)', suggestions: async () => [{ label: 'Skip' }], optional: true },
    ],
  },
  {
    id: 'add_transfer',
    tool: 'add_transfer',
    steps: [
      { slot: 'from', prompt: 'Transfer from which account?', suggestions: accountChips },
      { slot: 'to', prompt: 'And into which account?', suggestions: accountChips },
      { slot: 'amount', prompt: 'How much would you like to move?', parse: amountParser, invalid: 'Please give me an amount, like 2000.' },
    ],
  },
  {
    id: 'create_budget',
    tool: 'create_budget',
    steps: [
      { slot: 'category', prompt: 'Which category should I budget?', suggestions: () => categoryChips('expense') },
      { slot: 'amount', prompt: (s) => `What monthly limit for ${s.category}?`, parse: amountParser, invalid: 'Give me a monthly limit, like 5000.' },
    ],
  },
  {
    id: 'create_account',
    tool: 'create_account',
    steps: [
      { slot: 'name', prompt: 'What should I call the account?' },
      { slot: 'type', prompt: 'What type is it?', suggestions: async () => [{ label: 'Bank' }, { label: 'Cash' }, { label: 'Card' }, { label: 'Wallet' }] },
      { slot: 'balance', prompt: 'Opening balance? (or tap Skip)', suggestions: async () => [{ label: 'Skip' }], optional: true, parse: (i) => (isSkip(i) ? '0' : String(extractAmount(i) ?? 0)) },
    ],
  },
  {
    id: 'create_habit',
    tool: 'create_habit',
    steps: [
      { slot: 'name', prompt: 'What habit would you like to track?' },
      { slot: 'type', prompt: 'Are you building this habit or quitting it?', suggestions: async () => [{ label: 'Build' }, { label: 'Quit' }] },
    ],
  },
  {
    id: 'complete_habit',
    tool: 'complete_habit',
    steps: [
      { slot: 'name', prompt: 'Which habit did you complete?', suggestions: habitChips },
    ],
  },
  {
    id: 'create_reminder',
    tool: 'noop_reminder',
    intro: 'Reminders are attached to a habit.',
    steps: [
      { slot: 'name', prompt: 'Which habit should I remind you about?', suggestions: habitChips },
    ],
  },
];

export function getFlow(id: string): FlowDef | undefined {
  return FLOWS.find((f) => f.id === id);
}

export function promptFor(step: FlowStep, slots: Record<string, string>): string {
  return typeof step.prompt === 'function' ? step.prompt(slots) : step.prompt;
}
