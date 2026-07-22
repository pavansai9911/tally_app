// Lightweight offline NLU: intent scoring + entity extraction.
//
// Deliberately simple and dependency-free. When an LLM is plugged in later this whole file
// becomes optional — the engine can ask the model for {intent, entities} in the same shape.

import { INTENTS, IntentDef } from './intents';

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s'.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'my', 'me', 'i', 'is', 'are', 'was', 'on', 'in', 'at', 'please', 'can', 'you', 'do', 'show', 'get', 'want', 'would', 'like', 'give']);

function tokens(text: string): string[] {
  return normalise(text).split(' ').filter((t) => t && !STOP.has(t));
}

/**
 * Score an intent against the input.
 *  - exact/substring phrase match scores highest
 *  - otherwise token overlap, normalised by phrase length
 */
function scoreIntent(input: string, intent: IntentDef): number {
  const norm = normalise(input);
  const inputTokens = new Set(tokens(input));
  let best = 0;

  for (const utterance of intent.utterances) {
    const u = normalise(utterance);
    if (norm === u) return 1000 + (intent.priority ?? 0);
    if (norm.includes(u)) {
      best = Math.max(best, 100 + u.length + (intent.priority ?? 0) * 5);
      continue;
    }
    const uTokens = tokens(utterance);
    if (uTokens.length === 0) continue;
    const hits = uTokens.filter((t) => inputTokens.has(t)).length;
    if (hits > 0) {
      const coverage = hits / uTokens.length;
      best = Math.max(best, coverage * 40 + hits * 6 + (intent.priority ?? 0) * 3);
    }
  }
  return best;
}

export interface IntentMatch {
  intent: IntentDef;
  score: number;
}

/** Best matching intent, or null when nothing is confident enough. */
export function matchIntent(input: string, minScore = 18): IntentMatch | null {
  let best: IntentMatch | null = null;
  for (const intent of INTENTS) {
    const score = scoreIntent(input, intent);
    if (score > (best?.score ?? 0)) best = { intent, score };
  }
  return best && best.score >= minScore ? best : null;
}

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

/** First money-like number in the text ("500", "1,200", "₹2.5k", "50000"). */
export function extractAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '');
  const kMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]\b/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const match = cleaned.match(/(?:^|[^\d.])(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Common spending words mapped to a likely category name. */
const CATEGORY_HINTS: Record<string, string> = {
  food: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food', restaurant: 'Food',
  snack: 'Food', coffee: 'Food', tea: 'Food', grocery: 'Groceries', groceries: 'Groceries',
  vegetables: 'Groceries', fuel: 'Transport', petrol: 'Transport', diesel: 'Transport',
  cab: 'Transport', taxi: 'Transport', uber: 'Transport', ola: 'Transport', bus: 'Transport',
  train: 'Transport', metro: 'Transport', travel: 'Transport', shopping: 'Shopping',
  clothes: 'Shopping', shoes: 'Shopping', amazon: 'Shopping', rent: 'Rent',
  electricity: 'Utilities', water: 'Utilities', gas: 'Utilities', internet: 'Utilities',
  wifi: 'Utilities', recharge: 'Utilities', mobile: 'Utilities', bill: 'Utilities',
  bills: 'Utilities', medicine: 'Health', doctor: 'Health', hospital: 'Health',
  pharmacy: 'Health', gym: 'Health', movie: 'Entertainment', netflix: 'Entertainment',
  spotify: 'Entertainment', game: 'Entertainment', entertainment: 'Entertainment',
  salary: 'Salary', freelance: 'Freelance', bonus: 'Salary', interest: 'Salary',
};

export function extractCategoryHint(text: string): string | null {
  for (const t of tokens(text)) {
    if (CATEGORY_HINTS[t]) return CATEGORY_HINTS[t];
  }
  return null;
}

/** True when the sentence reads like income rather than spending. */
export function looksLikeIncome(text: string): boolean {
  const n = normalise(text);
  return /\b(received|earned|got paid|salary|income|credited|refund|bonus)\b/.test(n);
}

export function looksLikeExpense(text: string): boolean {
  const n = normalise(text);
  return /\b(spent|spend|paid|bought|purchase|expense|cost)\b/.test(n);
}

/** Yes/no detection for confirmation steps. */
export function isAffirmative(text: string): boolean {
  return /^(y|yes|yeah|yep|sure|ok|okay|confirm|correct|right|do it|please)\b/.test(normalise(text));
}

export function isNegative(text: string): boolean {
  return /^(n|no|nope|nah|cancel|skip|don't|dont)\b/.test(normalise(text));
}

/** "skip"/"none"/"-" used to leave an optional slot empty. */
export function isSkip(text: string): boolean {
  return /^(skip|none|no note|nothing|na|n\/a|-)$/.test(normalise(text));
}
