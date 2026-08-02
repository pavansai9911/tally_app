// Offline "Send feedback" — opens the user's mail app via a mailto: intent with a pre-drafted
// message. Nothing is sent automatically; the user reviews and taps Send in their mail app.
// No network from the app, no new dependencies (Linking + Platform.constants are RN core).

import { Linking, Platform } from 'react-native';
import { APP_VERSION } from '@/constants/app';

/** Where feedback goes (hardcoded at build time). */
export const FEEDBACK_EMAIL = 'pavansai9911@gmail.com';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "02 Aug 2026, 2:30 PM" in local time — built manually (no Intl, which isn't guaranteed). */
function nowStamp(): string {
  const d = new Date();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${pad2(d.getMinutes())} ${ampm}`;
}

/** versionCode is derived from the version string (1.3.1 -> 10301), mirroring build.gradle. */
function buildCode(v: string): number {
  const [a, b, c] = v.split('.').map((n) => parseInt(n, 10) || 0);
  return a * 10000 + b * 100 + c;
}

/** Auto-appended diagnostics block so reports carry the context needed to act on them. */
function diagnostics(): string {
  const c = (Platform.constants ?? {}) as Record<string, any>;
  const release = c.Release ?? '?';
  const sdk = Platform.Version;
  const device = [c.Manufacturer ?? c.Brand, c.Model].filter(Boolean).join(' · ') || 'Unknown device';
  const line = '──────────────────────────────';
  return [
    line,
    'Sent from the Tally app',
    `App version:  ${APP_VERSION} (build ${buildCode(APP_VERSION)})`,
    `Android:      ${release} (SDK ${sdk})`,
    `Device:       ${device}`,
    `Date:         ${nowStamp()}`,
    line,
  ].join('\n');
}

/**
 * Open the mail app with a pre-filled feedback email. `subject` is the user's subject (or a
 * short label from the assistant); it is prefixed with "[Tally Feedback] ". `message` is the
 * user's message (or the assistant Q&A). The diagnostics block is appended automatically.
 * Returns false if no mail app could be opened (caller shows a fallback with the address).
 */
export async function openFeedbackEmail(subject: string, message: string): Promise<boolean> {
  const fullSubject = `[Tally Feedback] ${subject.trim()}`.trim();
  const fullBody = `${message.trim()}\n\n${diagnostics()}`;
  const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(fullBody)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
